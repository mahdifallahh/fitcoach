import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RequestOtpDto {
  @ApiProperty({ example: '+989120000000', description: 'Phone or email' })
  @IsString()
  @MinLength(3)
  identifier!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+989120000000', description: 'Phone or email' })
  @IsString()
  @MinLength(3)
  identifier!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8)
  code!: string;

  @ApiPropertyOptional({ enum: Role, description: 'Role to assign when creating a new account' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class RequestMagicLinkDto {
  @ApiProperty({ example: 'coach@example.com' })
  @IsString()
  @MinLength(3)
  identifier!: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
