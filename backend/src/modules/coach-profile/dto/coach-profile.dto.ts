import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HANDLE_REGEX } from '../../../common/utils/handle.util';

export class SocialLinkDto {
  @ApiProperty({ example: 'instagram', description: 'Platform key (free-form)' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  type!: string;

  @ApiPropertyOptional({ example: '@coach' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiProperty({ example: 'https://instagram.com/coach' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url!: string;
}

export class UpdateCoachProfileDto {
  @ApiPropertyOptional({ description: 'Public page handle (a–z, 0–9, hyphen; 3–30 chars)' })
  @IsOptional()
  @IsString()
  @Matches(HANDLE_REGEX, { message: 'handle must be 3–30 chars of lowercase letters, digits or hyphens' })
  handle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: [SocialLinkDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}
