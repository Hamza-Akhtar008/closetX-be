import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { SellerVerification } from './entities/seller-verification.entity';
import { UsersService } from '../users/users.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { S3Service } from '../common/storage/s3.service';
import { MailService } from '../mail/mail.service';
import {
  ibanLast4,
  isValidSaudiIban,
  saudiBankFromIban,
} from '../common/utils/iban';

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class SellerVerificationService {
  constructor(
    @InjectRepository(SellerVerification)
    private readonly repo: Repository<SellerVerification>,
    private readonly users: UsersService,
    private readonly crypto: CryptoService,
    private readonly s3: S3Service,
    private readonly mail: MailService,
  ) {}

  private async getOrCreate(userId: string): Promise<SellerVerification> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ userId, status: 'in_review' }));
  }

  /** Editing any step is blocked once approved; otherwise it re-opens review. */
  private reopen(v: SellerVerification): void {
    if (v.status === 'approved') {
      throw new BadRequestException('alreadyApproved');
    }
    v.status = 'in_review';
    v.submittedAt = null;
  }

  private toStatus(v: SellerVerification) {
    return {
      status: v.status,
      steps: {
        nationalId: !!v.nationalIdHash,
        iban: !!v.ibanEncrypted,
        terms: !!v.termsAcceptedAt,
      },
      ibanLast4: v.ibanLast4,
      bankName: v.bankName,
      rejectionReason: v.status === 'rejected' ? v.rejectionReason : null,
      submittedAt: v.submittedAt,
      reviewedAt: v.reviewedAt,
    };
  }

  async getForUser(userId: string) {
    const v = await this.repo.findOne({ where: { userId } });
    if (!v) {
      return {
        status: 'not_started' as const,
        steps: { nationalId: false, iban: false, terms: false },
        ibanLast4: null,
        bankName: null,
        rejectionReason: null,
        submittedAt: null,
        reviewedAt: null,
      };
    }
    return this.toStatus(v);
  }

  async submitNationalId(
    userId: string,
    idNumber: string,
    front: UploadedImage,
    back: UploadedImage,
  ) {
    if (!front || !back) {
      throw new BadRequestException('frontAndBackRequired');
    }
    const hash = this.crypto.hashNationalId(idNumber);
    const clash = await this.repo.findOne({ where: { nationalIdHash: hash } });
    if (clash && clash.userId !== userId) {
      throw new ConflictException('nationalIdAlreadyUsed');
    }

    const v = await this.getOrCreate(userId);
    this.reopen(v);
    const ext = (m: string) => (m.includes('png') ? 'png' : 'jpg');
    v.nationalIdFrontUrl = await this.s3.putPrivate(
      `seller-verification/${userId}/front-${randomUUID()}.${ext(front.mimetype)}`,
      front.buffer,
      front.mimetype,
    );
    v.nationalIdBackUrl = await this.s3.putPrivate(
      `seller-verification/${userId}/back-${randomUUID()}.${ext(back.mimetype)}`,
      back.buffer,
      back.mimetype,
    );
    v.nationalIdHash = hash;
    try {
      await this.repo.save(v);
    } catch (err) {
      // Backstop the app-level check with the DB partial-unique index.
      if (err instanceof QueryFailedError) {
        throw new ConflictException('nationalIdAlreadyUsed');
      }
      throw err;
    }
    return this.toStatus(v);
  }

  async submitIban(userId: string, rawIban: string) {
    if (!isValidSaudiIban(rawIban)) {
      throw new BadRequestException('invalidIban');
    }
    const v = await this.getOrCreate(userId);
    this.reopen(v);
    v.ibanEncrypted = this.crypto.encrypt(rawIban.replace(/\s+/g, '').toUpperCase());
    v.ibanLast4 = ibanLast4(rawIban);
    v.bankName = saudiBankFromIban(rawIban) ?? 'Unknown bank';
    await this.repo.save(v);
    return this.toStatus(v);
  }

  async acceptTerms(userId: string, locale?: string) {
    const v = await this.getOrCreate(userId);
    if (v.status === 'approved') throw new BadRequestException('alreadyApproved');
    v.termsAcceptedAt = new Date();
    if (locale) await this.users.setLocale(userId, locale);
    // All three steps present → submit for admin review.
    if (v.nationalIdHash && v.ibanEncrypted && v.termsAcceptedAt) {
      v.status = 'pending';
      v.submittedAt = new Date();
    }
    await this.repo.save(v);
    return this.toStatus(v);
  }

  // ───────────────────────────  Admin  ───────────────────────────

  async adminList(status?: string) {
    const where = status && status !== 'all' ? { status: status as never } : {};
    const rows = await this.repo.find({
      where,
      relations: { user: true },
      order: { submittedAt: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((v) => ({
      id: v.id,
      userId: v.userId,
      name: v.user?.fullName || v.user?.email || 'Seller',
      email: v.user?.email ?? null,
      status: v.status,
      submittedAt: v.submittedAt,
      bankName: v.bankName,
      ibanLast4: v.ibanLast4,
      docs: {
        id: !!v.nationalIdHash,
        iban: !!v.ibanEncrypted,
        terms: !!v.termsAcceptedAt,
      },
    }));
  }

  async adminDetail(id: string) {
    const v = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!v) throw new NotFoundException('verificationNotFound');
    return {
      id: v.id,
      userId: v.userId,
      name: v.user?.fullName || v.user?.email || 'Seller',
      email: v.user?.email ?? null,
      status: v.status,
      submittedAt: v.submittedAt,
      reviewedAt: v.reviewedAt,
      rejectionReason: v.rejectionReason,
      bankName: v.bankName,
      ibanLast4: v.ibanLast4,
      // Short-lived (1h) pre-signed URLs — admin-only image access.
      frontUrl: v.nationalIdFrontUrl
        ? await this.s3.getSignedReadUrl(v.nationalIdFrontUrl)
        : null,
      backUrl: v.nationalIdBackUrl
        ? await this.s3.getSignedReadUrl(v.nationalIdBackUrl)
        : null,
    };
  }

  async approve(adminId: string, id: string) {
    const v = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!v) throw new NotFoundException('verificationNotFound');
    v.status = 'approved';
    v.reviewedAt = new Date();
    v.reviewedBy = adminId;
    v.rejectionReason = null;
    await this.repo.save(v);
    if (v.user) {
      await this.mail.sendSellerApproved(
        v.user.email,
        v.user.fullName ?? '',
        v.user.locale ?? 'en',
      );
    }
    return { id: v.id, status: v.status };
  }

  async reject(adminId: string, id: string, reason: string) {
    const v = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!v) throw new NotFoundException('verificationNotFound');
    v.status = 'rejected';
    v.reviewedAt = new Date();
    v.reviewedBy = adminId;
    v.rejectionReason = reason;
    await this.repo.save(v);
    if (v.user) {
      await this.mail.sendSellerRejected(
        v.user.email,
        v.user.fullName ?? '',
        reason,
        v.user.locale ?? 'en',
      );
    }
    return { id: v.id, status: v.status };
  }
}
