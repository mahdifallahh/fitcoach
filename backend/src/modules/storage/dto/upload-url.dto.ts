import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const IMAGE_CONTENT_TYPES = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'] as const;

export class ImageUploadUrlDto {
  @ApiProperty({ enum: IMAGE_CONTENT_TYPES, description: 'MIME type of the file to upload' })
  @IsIn(IMAGE_CONTENT_TYPES as unknown as string[])
  contentType!: string;
}
