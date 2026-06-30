import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProgramRequestsService } from './program-requests.service';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@ApiTags('program-requests')
@Roles(Role.COACH)
@Controller('coach/requests')
export class CoachRequestsController {
  constructor(private readonly service: ProgramRequestsService) {}

  @Get()
  list(@CurrentUser('id') coachId: string) {
    return this.service.listForCoach(coachId);
  }

  @Patch(':id')
  updateStatus(
    @CurrentUser('id') coachId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.service.updateStatus(coachId, id, dto.status);
  }
}
