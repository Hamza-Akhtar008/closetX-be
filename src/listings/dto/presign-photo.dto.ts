import { IsString, Matches } from 'class-validator';

export class PresignPhotoDto {
  @IsString()
  @Matches(/^image\/(png|jpe?g|webp)$/, { message: 'unsupported image type' })
  contentType: string;
}
