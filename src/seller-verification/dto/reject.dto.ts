import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectDto {
  /** A rejection reason is REQUIRED — emailed to the seller. */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
