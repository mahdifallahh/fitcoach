import { ApiProperty } from '@nestjs/swagger';
import { ProgramRequestStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateRequestStatusDto {
  @ApiProperty({ enum: [ProgramRequestStatus.REVIEWED, ProgramRequestStatus.DECLINED] })
  @IsIn([ProgramRequestStatus.REVIEWED, ProgramRequestStatus.DECLINED])
  status!: ProgramRequestStatus;
}
