import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type VerificationStatus =
  | 'in_review' // collecting steps; not yet submitted
  | 'pending' // all steps done, awaiting admin
  | 'approved'
  | 'rejected';

/**
 * One row per seller (unique user_id). Holds KYC artefacts:
 *  - the national ID NUMBER is never stored raw — only its sha256 hash (unique
 *    index = "this ID hasn't been used before").
 *  - ID images live in a PRIVATE bucket; we keep the object keys here and mint
 *    short-lived pre-signed URLs on demand for admins.
 *  - the IBAN is stored AES-256-GCM encrypted; only last4 + bank are surfaced.
 */
@Entity('seller_verifications')
export class SellerVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true, name: 'national_id_hash' })
  nationalIdHash: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'national_id_front_url' })
  nationalIdFrontUrl: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'national_id_back_url' })
  nationalIdBackUrl: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'iban_encrypted' })
  ibanEncrypted: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'iban_last4' })
  ibanLast4: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'bank_name' })
  bankName: string | null;

  @Column({ type: 'varchar', default: 'in_review' })
  status: VerificationStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'terms_accepted_at' })
  termsAcceptedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
