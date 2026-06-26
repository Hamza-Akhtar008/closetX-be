import { IsString, MaxLength } from 'class-validator';

export class SubmitIbanDto {
  @IsString()
  @MaxLength(34)
  iban: string;
}
