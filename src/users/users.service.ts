import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.repo.create({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.repo.save(user);
  }

  async setRole(id: string, roleId: number): Promise<User> {
    await this.repo.update(id, { roleId });
    const user = await this.findById(id);
    if (!user) throw new Error('User not found after role update');
    return user;
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.repo.update(id, { emailVerified: true });
  }
}
