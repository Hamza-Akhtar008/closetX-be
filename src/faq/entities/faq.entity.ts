import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FaqStatus = 'published' | 'draft';

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'varchar' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'varchar', default: 'published' })
  status: FaqStatus;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'int', default: 0 })
  helpful: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
