import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { ProgramRequestsService } from './program-requests.service';
import { StudentRequestsController } from './student-requests.controller';
import { CoachRequestsController } from './coach-requests.controller';

@Module({
  imports: [StudentsModule],
  controllers: [StudentRequestsController, CoachRequestsController],
  providers: [ProgramRequestsService],
})
export class ProgramRequestsModule {}
