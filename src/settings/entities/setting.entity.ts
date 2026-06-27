import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Flat key-value platform settings (commission, fees, flags, …). */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
