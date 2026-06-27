import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBannerDto {
  @IsOptional() @IsString() @MaxLength(240) text?: string;
  @IsOptional() @IsString() @MaxLength(120) placement?: string;
  @IsOptional() @IsString() @MaxLength(40) tone?: string;
  @IsOptional() @IsIn(['live', 'scheduled', 'paused']) status?: 'live' | 'scheduled' | 'paused';
}
