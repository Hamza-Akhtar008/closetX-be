import { Equals, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptTermsDto {
  @IsBoolean()
  @Equals(true, { message: 'You must accept the seller terms' })
  accepted: boolean;

  /** Current UI language, persisted to the user for transactional emails. */
  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}
