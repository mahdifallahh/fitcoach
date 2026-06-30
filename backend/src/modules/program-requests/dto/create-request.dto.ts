import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProgramRequestDto {
  @ApiProperty({ description: 'Public handle of the coach being requested' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  handle!: string;

  @ApiProperty({ description: 'Full name / نام و نام خانوادگی' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({ description: 'Weight in kg / وزن' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Height in cm / قد' })
  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(260)
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Practice history / سابقه تمرینی' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  practiceHistory?: string;

  @ApiPropertyOptional({ description: 'Injuries / مصدومیت' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  injuries?: string;

  @ApiPropertyOptional({ description: 'Description / توضیحات' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String], description: 'Uploaded image object keys (private bucket)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  imageKeys?: string[];
}
