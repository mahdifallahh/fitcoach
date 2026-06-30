import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicCoachService } from './public-coach.service';

@ApiTags('public')
@Public()
@Controller('public/coaches')
export class PublicCoachController {
  constructor(private readonly service: PublicCoachService) {}

  @Get(':handle')
  get(@Param('handle') handle: string) {
    return this.service.getByHandle(handle);
  }
}
