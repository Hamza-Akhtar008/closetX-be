import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Brand } from './entities/brand.entity';
import {
  CreateBrandDto,
  CreateCategoryDto,
  CreateSubcategoryDto,
  UpdateCategoryDto,
} from './dto/catalog.dto';

const SEED_CATEGORIES = [
  { name: 'Women', sizes: ['XS', 'S', 'M', 'L', 'XL'], subs: ['Dresses', 'Tops', 'Bags', 'Shoes', 'Outerwear', 'Accessories'] },
  { name: 'Men', sizes: ['S', 'M', 'L', 'XL', 'XXL'], subs: ['Shirts', 'Trousers', 'Bags', 'Shoes', 'Outerwear', 'Accessories'] },
  { name: 'Kids', sizes: ['2-3y', '4-5y', '6-7y', '8-9y', '10-12y'], subs: ['Tops', 'Bottoms', 'Shoes', 'Outerwear'] },
];
const SEED_BRANDS = ['Zara', 'H&M', 'Mango', 'Nike', 'Adidas', 'Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Dior', "Levi's", 'Uniqlo'];

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Category) private readonly catRepo: Repository<Category>,
    @InjectRepository(Subcategory) private readonly subRepo: Repository<Subcategory>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      if ((await this.catRepo.count()) === 0) {
        let pos = 0;
        for (const c of SEED_CATEGORIES) {
          const cat = await this.catRepo.save(
            this.catRepo.create({ name: c.name, sizes: JSON.stringify(c.sizes), position: pos++ }),
          );
          await this.subRepo.save(c.subs.map((name) => this.subRepo.create({ categoryId: cat.id, name })));
        }
      }
      if ((await this.brandRepo.count()) === 0) {
        await this.brandRepo.save(SEED_BRANDS.map((name) => this.brandRepo.create({ name })));
      }
    } catch (err) {
      this.logger.warn(`Catalog seeding skipped (run migrations?): ${(err as Error).message}`);
    }
  }

  private mapCategory(c: Category) {
    let sizes: string[] = [];
    try {
      sizes = c.sizes ? (JSON.parse(c.sizes) as string[]) : [];
    } catch {
      sizes = [];
    }
    return {
      id: c.id,
      name: c.name,
      sizes,
      subcategories: (c.subcategories ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ id: s.id, name: s.name })),
    };
  }

  private loadCategories() {
    return this.catRepo.find({
      relations: { subcategories: true },
      order: { position: 'ASC', name: 'ASC' },
    });
  }

  async getCatalog() {
    const [cats, brands] = await Promise.all([
      this.loadCategories(),
      this.brandRepo.find({ order: { name: 'ASC' } }),
    ]);
    return {
      categories: cats.map((c) => this.mapCategory(c)),
      brands: brands.map((b) => ({ id: b.id, name: b.name })),
    };
  }

  // ── Categories (admin) ──
  async listCategories() {
    return (await this.loadCategories()).map((c) => this.mapCategory(c));
  }

  async createCategory(dto: CreateCategoryDto) {
    try {
      const cat = await this.catRepo.save(
        this.catRepo.create({ name: dto.name.trim(), sizes: JSON.stringify(dto.sizes ?? []) }),
      );
      return this.mapCategory({ ...cat, subcategories: [] });
    } catch (err) {
      if (err instanceof QueryFailedError) throw new ConflictException('categoryExists');
      throw err;
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.catRepo.findOne({ where: { id }, relations: { subcategories: true } });
    if (!cat) throw new NotFoundException('categoryNotFound');
    if (dto.name !== undefined) cat.name = dto.name.trim();
    if (dto.sizes !== undefined) cat.sizes = JSON.stringify(dto.sizes);
    await this.catRepo.save(cat);
    return this.mapCategory(cat);
  }

  async deleteCategory(id: string) {
    const cat = await this.catRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException('categoryNotFound');
    await this.catRepo.remove(cat);
    return { id, deleted: true };
  }

  // ── Subcategories (admin) ──
  async createSubcategory(dto: CreateSubcategoryDto) {
    const cat = await this.catRepo.findOne({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('categoryNotFound');
    const sub = await this.subRepo.save(
      this.subRepo.create({ categoryId: dto.categoryId, name: dto.name.trim() }),
    );
    return { id: sub.id, name: sub.name, categoryId: sub.categoryId };
  }

  async deleteSubcategory(id: string) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('subcategoryNotFound');
    await this.subRepo.remove(sub);
    return { id, deleted: true };
  }

  // ── Brands (admin) ──
  async listBrands() {
    return (await this.brandRepo.find({ order: { name: 'ASC' } })).map((b) => ({ id: b.id, name: b.name }));
  }

  async createBrand(dto: CreateBrandDto) {
    try {
      const b = await this.brandRepo.save(this.brandRepo.create({ name: dto.name.trim() }));
      return { id: b.id, name: b.name };
    } catch (err) {
      if (err instanceof QueryFailedError) throw new ConflictException('brandExists');
      throw err;
    }
  }

  async deleteBrand(id: string) {
    const b = await this.brandRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('brandNotFound');
    await this.brandRepo.remove(b);
    return { id, deleted: true };
  }

  /**
   * Find-or-create a brand by name (case-insensitive). Used when a seller types
   * a custom brand on a listing so it joins the catalog. Never throws.
   */
  async ensureBrand(name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    try {
      const existing = await this.brandRepo
        .createQueryBuilder('b')
        .where('LOWER(b.name) = LOWER(:n)', { n: trimmed })
        .getOne();
      if (!existing) {
        await this.brandRepo.save(this.brandRepo.create({ name: trimmed }));
      }
    } catch (err) {
      // Unique-constraint race or other — ignore so the listing still saves.
      this.logger.warn(`ensureBrand("${trimmed}") skipped: ${(err as Error).message}`);
    }
  }
}
