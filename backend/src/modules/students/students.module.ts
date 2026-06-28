import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentController } from './student.controller';

@Module({
  controllers: [StudentController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
