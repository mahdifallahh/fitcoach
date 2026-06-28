import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-subscription.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@Roles(Role.COACH)
@Controller('coach/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list(@CurrentUser('id') coachId: string) {
    return this.service.list(coachId);
  }

  @RequiresActiveSubscription()
  @Post()
  create(@CurrentUser('id') coachId: string, @Body() dto: CreateCategoryDto) {
    return this.service.create(coachId, dto.name);
  }

  @RequiresActiveSubscription()
  @Patch(':id')
  rename(@CurrentUser('id') coachId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.rename(coachId, id, dto.name);
  }

  @RequiresActiveSubscription()
  @Delete(':id')
  remove(@CurrentUser('id') coachId: string, @Param('id') id: string) {
    return this.service.remove(coachId, id);
  }
}
