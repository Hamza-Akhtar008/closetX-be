import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

export interface NewNotification {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /** Best-effort create — never throws into the calling flow. */
  async create(n: NewNotification): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          userId: n.userId,
          type: n.type,
          title: n.title,
          body: n.body ?? null,
          link: n.link ?? null,
        }),
      );
    } catch {
      /* ignore — notifications must not break order flows */
    }
  }

  async list(userId: string) {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const unread = rows.filter((r) => !r.read).length;
    return { items: rows, unread };
  }

  async markRead(userId: string, id: string) {
    await this.repo.update({ id, userId }, { read: true });
    return { id, read: true };
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, read: false }, { read: true });
    return { ok: true };
  }
}
