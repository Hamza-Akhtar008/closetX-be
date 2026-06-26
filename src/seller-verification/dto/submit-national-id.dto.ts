import { IsString, Matches } from 'class-validator';

export class SubmitNationalIdDto {
  /** Saudi National ID / Iqama — 10 digits. Stored only as a sha256 hash. */
  @IsString()
  @Matches(/^\d{10}$/, { message: 'idNumber must be 10 digits' })
  idNumber: string;
}
