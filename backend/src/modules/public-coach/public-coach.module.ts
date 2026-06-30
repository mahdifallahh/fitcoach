import { Module } from '@nestjs/common';
import { PublicCoachController } from './public-coach.controller';
import { PublicCoachService } from './public-coach.service';

@Module({
  controllers: [PublicCoachController],
  providers: [PublicCoachService],
})
export class PublicCoachModule {}
