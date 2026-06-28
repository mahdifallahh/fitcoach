import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageUploadUrlDto } from '../storage/dto/upload-url.dto';
import { CoachProfileService } from './coach-profile.service';
import { UpdateCoachProfileDto } from './dto/coach-profile.dto';

@ApiTags('coach-profile')
@Roles(Role.COACH)
@Controller('coach/profile')
export class CoachProfileController {
  constructor(private readonly service: CoachProfileService) {}

  @Get()
  get(@CurrentUser('id') coachId: string) {
    return this.service.get(coachId);
  }

  @Patch()
  update(@CurrentUser('id') coachId: string, @Body() dto: UpdateCoachProfileDto) {
    return this.service.update(coachId, dto);
  }

  @Post('avatar-upload-url')
  avatarUploadUrl(@CurrentUser('id') coachId: string, @Body() dto: ImageUploadUrlDto) {
    return this.service.avatarUploadUrl(coachId, dto.contentType);
  }
}
