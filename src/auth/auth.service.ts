import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { OAuthAccount } from './entities/oauth-account.entity';
import { RegisterDto } from './dto/register.dto';
import {
  RoleChoice,
  ROLE_CHOICE_TO_ID,
} from '../common/constants/roles.constant';
import { OAuthProfile } from './strategies/google.strategy';
import { parseDurationMs } from '../common/utils/duration';
import { MailService } from '../mail/mail.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(OAuthAccount)
    private readonly oauthRepo: Repository<OAuthAccount>,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('emailTaken');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      country: dto.country ?? null,
      marketingOptIn: dto.marketingOptIn ?? false,
      roleId: null,
      emailVerified: false,
    });
    await this.sendVerificationEmail(user);
    return user;
  }

  async validateLocal(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('invalidCredentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalidCredentials');
    // Email/password accounts must confirm their email before signing in.
    if (!user.emailVerified) {
      throw new ForbiddenException('emailNotVerified');
    }
    return user;
  }

  // ── Email verification ──

  private async sendVerificationEmail(user: User): Promise<void> {
    const ttl = this.config.get<string>('emailVerification.ttl') ?? '1h';
    const token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, purpose: 'email_verify' },
      {
        secret: this.config.get<string>('emailVerification.secret'),
        expiresIn: ttl as JwtSignOptions['expiresIn'],
      },
    );
    const frontendUrl = this.config.get<string>('frontendUrl');
    const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const hours = Math.max(1, Math.round(parseDurationMs(ttl) / 3_600_000));
    await this.mailService.sendVerificationEmail(
      user.email,
      user.fullName ?? '',
      verifyUrl,
      hours,
    );
  }

  async verifyEmailToken(token: string): Promise<User> {
    let payload: { sub: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('emailVerification.secret'),
      });
    } catch {
      throw new BadRequestException('invalidOrExpiredToken');
    }
    if (payload.purpose !== 'email_verify') {
      throw new BadRequestException('invalidOrExpiredToken');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new BadRequestException('invalidOrExpiredToken');
    if (!user.emailVerified) {
      await this.usersService.markEmailVerified(user.id);
      user.emailVerified = true;
    }
    return user;
  }

  /** Re-sends verification if the email exists and isn't verified yet.
   *  Always resolves (never reveals whether the address exists). */
  async resendVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (user && !user.emailVerified) {
      await this.sendVerificationEmail(user);
    }
  }

  setRole(userId: string, choice: RoleChoice): Promise<User> {
    return this.usersService.setRole(userId, ROLE_CHOICE_TO_ID[choice]);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, roleId: user.roleId },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>(
          'jwt.accessTtl',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    const refreshTtl = this.config.get<string>('jwt.refreshTtl')!;
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: refreshTtl as JwtSignOptions['expiresIn'],
      },
    );

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationMs(refreshTtl)),
        revoked: false,
      }),
    );

    return { accessToken, refreshToken };
  }

  async rotateRefresh(
    presentedToken: string | null,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    if (!presentedToken) throw new UnauthorizedException();

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(presentedToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException();
    }

    const tokenHash = this.hashToken(presentedToken);
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash, userId: payload.sub },
    });

    if (!stored || stored.revoked) {
      // Reuse of an already-rotated/unknown token → revoke all for safety.
      await this.refreshRepo.update({ userId: payload.sub }, { revoked: true });
      throw new UnauthorizedException();
    }

    stored.revoked = true;
    await this.refreshRepo.save(stored);

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async revokeByToken(presentedToken: string | undefined): Promise<void> {
    if (!presentedToken) return;
    await this.refreshRepo.update(
      { tokenHash: this.hashToken(presentedToken) },
      { revoked: true },
    );
  }

  /** Find-or-create for an OAuth sign-in; new users get roleId null. */
  async oauthFindOrCreate(
    provider: string,
    profile: OAuthProfile,
  ): Promise<User> {
    const link = await this.oauthRepo.findOne({
      where: { provider, providerAccountId: profile.providerAccountId },
    });
    if (link) {
      const linked = await this.usersService.findById(link.userId);
      if (linked) return linked;
    }

    let user = profile.email
      ? await this.usersService.findByEmail(profile.email)
      : null;

    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        passwordHash: null,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        roleId: null,
        emailVerified: true,
      });
    }

    if (!link) {
      await this.oauthRepo.save(
        this.oauthRepo.create({
          provider,
          providerAccountId: profile.providerAccountId,
          userId: user.id,
        }),
      );
    }
    return user;
  }
}
