import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-subscription.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageUploadUrlDto } from '../storage/dto/upload-url.dto';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, ListExercisesQueryDto, UpdateExerciseDto } from './dto/exercise.dto';

@ApiTags('exercises')
@Roles(Role.COACH)
@Controller('coach/exercises')
export class ExercisesController {
  constructor(private readonly service: ExercisesService) {}

  @Get()
  list(@CurrentUser('id') coachId: string, @Query() query: ListExercisesQueryDto) {
    return this.service.list(coachId, query);
  }

  @Post('gif-upload-url')
  gifUploadUrl(@CurrentUser('id') coachId: string, @Body() dto: ImageUploadUrlDto) {
    return this.service.gifUploadUrl(coachId, dto.contentType);
  }

  @Get(':id')
  get(@CurrentUser('id') coachId: string, @Param('id') id: string) {
    return this.service.get(coachId, id);
  }

  @RequiresActiveSubscription()
  @Post()
  create(@CurrentUser('id') coachId: string, @Body() dto: CreateExerciseDto) {
    return this.service.create(coachId, dto);
  }

  @RequiresActiveSubscription()
  @Patch(':id')
  update(@CurrentUser('id') coachId: string, @Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.service.update(coachId, id, dto);
  }

  @RequiresActiveSubscription()
  @Delete(':id')
  remove(@CurrentUser('id') coachId: string, @Param('id') id: string) {
    return this.service.remove(coachId, id);
  }
}
