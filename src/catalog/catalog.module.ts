import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Brand } from './entities/brand.entity';
import { CatalogService } from './catalog.service';
import { AdminCatalogController, PublicCatalogController } from './catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Subcategory, Brand])],
  controllers: [PublicCatalogController, AdminCatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
