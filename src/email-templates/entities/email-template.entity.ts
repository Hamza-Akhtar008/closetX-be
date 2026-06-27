import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Editable transactional email templates (English). MailService renders these
 * (with {{variable}} interpolation), falling back to the code templates if a
 * row is missing.
 */
@Entity('email_templates')
export class EmailTemplate {
  /** Stable key, e.g. 'emailVerification', 'sellerApproved'. */
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  html: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
