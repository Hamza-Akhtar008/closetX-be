import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ADMIN_ACCESS } from '../common/constants/roles.constant';
import { CatalogService } from './catalog.service';
import {
  CreateBrandDto,
  CreateCategoryDto,
  CreateSubcategoryDto,
  UpdateCategoryDto,
} from './dto/catalog.dto';

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  get() {
    return this.catalog.getCatalog();
  }
}

@Roles(...ADMIN_ACCESS)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalog.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalog.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.catalog.deleteCategory(id);
  }

  @Post('subcategories')
  createSubcategory(@Body() dto: CreateSubcategoryDto) {
    return this.catalog.createSubcategory(dto);
  }

  @Delete('subcategories/:id')
  deleteSubcategory(@Param('id') id: string) {
    return this.catalog.deleteSubcategory(id);
  }

  @Get('brands')
  listBrands() {
    return this.catalog.listBrands();
  }

  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalog.createBrand(dto);
  }

  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string) {
    return this.catalog.deleteBrand(id);
  }
}
