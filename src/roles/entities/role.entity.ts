import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Seeded reference table: 1=admin, 2=seller, 3=buyer, 4=seller+buyer. */
@Entity('roles')
export class Role {
  // Explicit (non-generated) ids so they stay stable across environments.
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
