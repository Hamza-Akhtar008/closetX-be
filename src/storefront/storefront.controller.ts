import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { StorefrontService } from './storefront.service';

function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const arr = v.map(String).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

@Public()
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly service: StorefrontService) {}

  @Get('home')
  home() {
    return this.service.home();
  }

  @Get('product/:id')
  product(@Param('id') id: string) {
    return this.service.product(id);
  }

  @Get('listings')
  search(@Query() q: Record<string, unknown>) {
    return this.service.search({
      q: typeof q.q === 'string' ? q.q : undefined,
      category: typeof q.category === 'string' ? q.category : undefined,
      subcategory: csv(q.type),
      brand: csv(q.brand),
      condition: csv(q.condition),
      min: num(q.min),
      max: num(q.max),
      sort: typeof q.sort === 'string' ? q.sort : undefined,
      page: num(q.page),
      limit: num(q.limit),
    });
  }
}
