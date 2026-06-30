import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageUploadUrlDto } from '../storage/dto/upload-url.dto';
import { ProgramRequestsService } from './program-requests.service';
import { CreateProgramRequestDto } from './dto/create-request.dto';

@ApiTags('program-requests')
@Roles(Role.STUDENT)
@Controller('student/requests')
export class StudentRequestsController {
  constructor(private readonly service: ProgramRequestsService) {}

  @Post('image-upload-url')
  imageUploadUrl(@CurrentUser('id') studentId: string, @Body() dto: ImageUploadUrlDto) {
    return this.service.imageUploadUrl(studentId, dto.contentType);
  }

  @Post()
  create(@CurrentUser('id') studentId: string, @Body() dto: CreateProgramRequestDto) {
    return this.service.create(studentId, dto);
  }

  @Get()
  mine(@CurrentUser('id') studentId: string) {
    return this.service.listForStudent(studentId);
  }
}
