import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const CATEGORIES = ['buying', 'selling', 'trust', 'payments', 'shipping'];

export class CreateFaqDto {
  @IsIn(CATEGORIES)
  category: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  question: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  answer: string;

  @IsOptional()
  @IsIn(['published', 'draft'])
  status?: 'published' | 'draft';

  @IsOptional()
  @IsInt()
  position?: number;
}

export class UpdateFaqDto {
  @IsOptional() @IsIn(CATEGORIES) category?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(300) question?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(4000) answer?: string;
  @IsOptional() @IsIn(['published', 'draft']) status?: 'published' | 'draft';
  @IsOptional() @IsInt() position?: number;
}
