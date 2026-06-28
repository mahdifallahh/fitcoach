import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProgramStatus } from '@prisma/client';

export class ProgramExerciseInputDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  exerciseId!: string;

  @ApiProperty({ default: 3 })
  @IsInt()
  @Min(1)
  @Max(50)
  sets!: number;

  @ApiProperty({ example: '8-12' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  reps!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ description: 'Sequence of the row (single item or superset group) within the day' })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiPropertyOptional({ description: 'Shared id groups exercises into one superset' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  supersetGroupId?: string;

  @ApiPropertyOptional({ description: 'Sequence within the superset group' })
  @IsOptional()
  @IsInt()
  @Min(0)
  supersetOrder?: number;
}

export class ProgramDayInputDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  dayIndex!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ type: [ProgramExerciseInputDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseInputDto)
  exercises!: ProgramExerciseInputDto[];
}

class StudentStatsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(400)
  weightKg?: number;
}

export class CreateProgramDto extends StudentStatsDto {
  @ApiProperty({ description: 'Student phone or email (account may not exist yet)' })
  @IsString()
  @MinLength(3)
  studentContact!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(14)
  daysPerWeek!: number;

  @ApiPropertyOptional({ enum: ProgramStatus })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiProperty({ type: [ProgramDayInputDto] })
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => ProgramDayInputDto)
  days!: ProgramDayInputDto[];
}

export class UpdateProgramDto extends StudentStatsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  daysPerWeek?: number;

  @ApiPropertyOptional({ enum: ProgramStatus })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiPropertyOptional({ type: [ProgramDayInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => ProgramDayInputDto)
  days?: ProgramDayInputDto[];
}

export class SetStatusDto {
  @ApiProperty({ enum: ProgramStatus })
  @IsEnum(ProgramStatus)
  status!: ProgramStatus;
}
