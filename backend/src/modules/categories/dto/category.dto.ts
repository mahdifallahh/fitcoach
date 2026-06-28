import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Chest' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Upper Chest' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}
