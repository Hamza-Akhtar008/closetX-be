import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address) private readonly repo: Repository<Address>,
  ) {}

  list(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async findOwned(userId: string, id: string): Promise<Address> {
    const a = await this.repo.findOne({ where: { id, userId } });
    if (!a) throw new NotFoundException('addressNotFound');
    return a;
  }

  private async clearDefault(userId: string, exceptId?: string) {
    await this.repo.update(
      { userId, isDefault: true, ...(exceptId ? { id: Not(exceptId) } : {}) },
      { isDefault: false },
    );
  }

  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.repo.count({ where: { userId } });
    const isDefault = dto.isDefault || count === 0;
    if (isDefault) await this.clearDefault(userId);
    const saved = await this.repo.save(
      this.repo.create({
        userId,
        label: dto.label ?? null,
        name: dto.name,
        phone: dto.phone,
        street: dto.street,
        apartment: dto.apartment ?? null,
        region: dto.region ?? null,
        city: dto.city,
        postalCode: dto.postalCode ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        notes: dto.notes ?? null,
        isDefault,
      }),
    );
    return saved;
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const a = await this.findOwned(userId, id);
    if (dto.isDefault) await this.clearDefault(userId, id);
    Object.assign(a, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.street !== undefined && { street: dto.street }),
      ...(dto.apartment !== undefined && { apartment: dto.apartment }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
      ...(dto.lat !== undefined && { lat: dto.lat }),
      ...(dto.lng !== undefined && { lng: dto.lng }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
    });
    return this.repo.save(a);
  }

  async remove(userId: string, id: string) {
    const a = await this.findOwned(userId, id);
    await this.repo.remove(a);
    return { id, deleted: true };
  }
}
