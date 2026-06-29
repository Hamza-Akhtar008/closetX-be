import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';

const SEED: { category: string; question: string; answer: string; status?: 'draft' }[] = [
  { category: 'buying', question: 'How does buyer protection (escrow) work?', answer: 'Your money is held securely in ClosetX Escrow until you receive your item and confirm it matches the listing. Only then is the seller paid.' },
  { category: 'buying', question: 'How do I track my order?', answer: 'Open the order from your account to see live courier tracking from dispatch to delivery.' },
  { category: 'buying', question: 'When do I need to confirm delivery?', answer: 'Tap “Confirm delivery” when your item arrives and matches the listing. You then have a 14-day window to raise a dispute before the order closes.' },
  { category: 'buying', question: 'Can I cancel an order after paying?', answer: 'You can cancel for a full refund any time before the seller ships. After shipping, open a dispute instead.' },
  { category: 'selling', question: 'What commission does ClosetX charge?', answer: 'A flat 8% platform commission is applied to the gross sale price on every completed order.' },
  { category: 'selling', question: 'When and how do I get paid?', answer: 'Funds are released after the buyer confirms delivery and the 14-day window passes, then paid to your registered IBAN.' },
  { category: 'selling', question: 'How do I get my listings verified?', answer: 'Complete seller verification (national ID + IBAN). Verified sellers’ listings go live immediately; others are reviewed first.' },
  { category: 'trust', question: 'How do I open a dispute?', answer: 'Raise a dispute from the order within your 14-day window and our team will mediate between you and the seller.' },
  { category: 'trust', question: "Why can't I pay or chat off-platform?", answer: 'Off-platform deals lose buyer protection. Keep payments and messages on ClosetX to stay covered.' },
  { category: 'payments', question: 'How long do refunds take?', answer: 'Approved refunds are returned to your original payment method within 5–7 business days.' },
  { category: 'payments', question: 'Is VAT included in the price?', answer: 'Yes — all prices are inclusive of the 15% Saudi VAT.' },
  { category: 'shipping', question: 'When is shipping free?', answer: 'Standard shipping is free on all orders over SAR 300 across KSA.' },
];

@Injectable()
export class FaqService implements OnModuleInit {
  private readonly logger = new Logger(FaqService.name);

  constructor(@InjectRepository(Faq) private readonly repo: Repository<Faq>) {}

  async onModuleInit() {
    try {
      if ((await this.repo.count()) === 0) {
        await this.repo.save(
          SEED.map((s, i) =>
            this.repo.create({
              category: s.category,
              question: s.question,
              answer: s.answer,
              status: s.status ?? 'published',
              position: i,
            }),
          ),
        );
        this.logger.log(`Seeded ${SEED.length} FAQs.`);
      }
    } catch (err) {
      this.logger.warn(`FAQ seeding skipped (run migrations?): ${(err as Error).message}`);
    }
  }

  listPublic() {
    return this.repo.find({
      where: { status: 'published' },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  adminList() {
    return this.repo.find({ order: { position: 'ASC', createdAt: 'ASC' } });
  }

  create(dto: CreateFaqDto) {
    return this.repo.save(
      this.repo.create({
        category: dto.category,
        question: dto.question,
        answer: dto.answer,
        status: dto.status ?? 'published',
        position: dto.position ?? 0,
      }),
    );
  }

  async update(id: string, dto: UpdateFaqDto) {
    const faq = await this.repo.findOne({ where: { id } });
    if (!faq) throw new NotFoundException('faqNotFound');
    Object.assign(faq, {
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.question !== undefined && { question: dto.question }),
      ...(dto.answer !== undefined && { answer: dto.answer }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.position !== undefined && { position: dto.position }),
    });
    return this.repo.save(faq);
  }

  async remove(id: string) {
    const faq = await this.repo.findOne({ where: { id } });
    if (!faq) throw new NotFoundException('faqNotFound');
    await this.repo.remove(faq);
    return { id, deleted: true };
  }
}
