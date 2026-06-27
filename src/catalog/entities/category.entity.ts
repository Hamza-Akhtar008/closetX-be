import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subcategory } from './subcategory.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  /** JSON array of size labels for this category. */
  @Column({ type: 'text', default: '[]' })
  sizes: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @OneToMany(() => Subcategory, (s) => s.category)
  subcategories: Subcategory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
