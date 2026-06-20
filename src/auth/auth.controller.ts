import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { User } from '../users/entities/user.entity';
import { toPublicUser } from './dto/public-user';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
  CookieConfig,
} from './cookies/cookie.util';
import { parseDurationMs } from '../common/utils/duration';
import type { OAuthProfile } from './strategies/google.strategy';
import type { RefreshRequestUser } from './strategies/jwt-refresh.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieConfig(): CookieConfig {
    return {
      secure: this.config.get<boolean>('cookie.secure') ?? false,
      domain: this.config.get<string>('cookie.domain'),
      accessMaxAge: parseDurationMs(this.config.get<string>('jwt.accessTtl')!),
      refreshMaxAge: parseDurationMs(this.config.get<string>('jwt.refreshTtl')!),
    };
  }

  private async issueAndSet(res: Response, user: User): Promise<void> {
    const tokens = await this.authService.issueTokens(user);
    setAuthCookies(res, tokens, this.cookieConfig());
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    // No session yet — the user must verify their email first (block-until-
    // verified). The verification link establishes the session.
    const user = await this.authService.register(dto);
    return { user: toPublicUser(user), verificationRequired: true };
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.verifyEmailToken(dto.token);
    // Verified → establish the session so the user can proceed to role select.
    await this.issueAndSet(res, user);
    return { user: toPublicUser(user) };
  }

  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return { success: true };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @CurrentUser() user: User,
    @Body() _dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.issueAndSet(res, user);
    return { user: toPublicUser(user) };
  }

  @Post('role')
  async setRole(
    @CurrentUser() user: User,
    @Body() dto: SetRoleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updated = await this.authService.setRole(user.id, dto.role);
    // Reissue so the new access token carries the updated roleId.
    await this.issueAndSet(res, updated);
    return { user: toPublicUser(updated) };
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    return { user: toPublicUser(user) };
  }

  // ── Google OAuth ──
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth(): void {
    // GoogleAuthGuard redirects to Google's consent screen.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @CurrentUser() profile: OAuthProfile,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.authService.oauthFindOrCreate('google', profile);
    await this.issueAndSet(res, user);
    const frontend = this.config.get<string>('frontendUrl')!;
    const dest =
      user.roleId == null
        ? `${frontend}/register/role?name=${encodeURIComponent(
            profile.givenName ?? user.fullName ?? '',
          )}`
        : `${frontend}/`;
    res.redirect(dest);
  }

  // ── Token lifecycle ──
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request & { user: RefreshRequestUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.rotateRefresh(
      req.user.refreshToken,
    );
    setAuthCookies(res, tokens, this.cookieConfig());
    return { user: toPublicUser(user) };
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeByToken(
      (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE],
    );
    clearAuthCookies(res, this.cookieConfig());
    return { success: true };
  }

  // ── Apple OAuth (deferred — needs Apple Dev account + HTTPS) ──
  @Public()
  @Get('apple')
  appleAuth(): never {
    throw new NotImplementedException('Apple sign-in is not configured yet');
  }

  @Public()
  @Post('apple/callback')
  appleCallback(): never {
    throw new NotImplementedException('Apple sign-in is not configured yet');
  }
}
