import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiresActiveSubscription } from '../../common/decorators/requires-subscription.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProgramsService } from './programs.service';
import { CreateProgramDto, SetStatusDto, UpdateProgramDto } from './dto/program.dto';

@ApiTags('programs')
@Roles(Role.COACH)
@Controller('coach/programs')
export class ProgramsController {
  constructor(private readonly service: ProgramsService) {}

  @Get()
  list(@CurrentUser('id') coachId: string) {
    return this.service.list(coachId);
  }

  @RequiresActiveSubscription()
  @Post()
  create(@CurrentUser('id') coachId: string, @Body() dto: CreateProgramDto) {
    return this.service.create(coachId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') coachId: string, @Param('id') id: string) {
    return this.service.get(coachId, id);
  }

  @RequiresActiveSubscription()
  @Patch(':id')
  update(@CurrentUser('id') coachId: string, @Param('id') id: string, @Body() dto: UpdateProgramDto) {
    return this.service.update(coachId, id, dto);
  }

  @RequiresActiveSubscription()
  @Patch(':id/status')
  setStatus(@CurrentUser('id') coachId: string, @Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.service.setStatus(coachId, id, dto.status);
  }

  @RequiresActiveSubscription()
  @Delete(':id')
  remove(@CurrentUser('id') coachId: string, @Param('id') id: string) {
    return this.service.remove(coachId, id);
  }
}
