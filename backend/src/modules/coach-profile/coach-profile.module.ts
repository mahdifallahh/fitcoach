import { Module } from '@nestjs/common';
import { CoachProfileController } from './coach-profile.controller';
import { CoachProfileService } from './coach-profile.service';

@Module({
  controllers: [CoachProfileController],
  providers: [CoachProfileService],
  exports: [CoachProfileService],
})
export class CoachProfileModule {}
