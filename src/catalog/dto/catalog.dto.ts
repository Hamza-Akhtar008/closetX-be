import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MinLength(1) @MaxLength(40) name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  sizes?: string[];
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  sizes?: string[];
}

export class CreateSubcategoryDto {
  @IsUUID() categoryId: string;
  @IsString() @MinLength(1) @MaxLength(40) name: string;
}

export class CreateBrandDto {
  @IsString() @MinLength(1) @MaxLength(60) name: string;
}
