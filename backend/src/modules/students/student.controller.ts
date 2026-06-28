import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StudentsService } from './students.service';

@ApiTags('student')
@Roles(Role.STUDENT)
@Controller('student')
export class StudentController {
  constructor(private readonly students: StudentsService) {}

  /** Coaches who have written programs for the logged-in student. */
  @Get('coaches')
  coaches(@CurrentUser('id') studentId: string) {
    return this.students.listCoaches(studentId);
  }

  /** Programs a given coach wrote for this student. */
  @Get('coaches/:coachId/programs')
  coachPrograms(@CurrentUser('id') studentId: string, @Param('coachId') coachId: string) {
    return this.students.listCoachPrograms(studentId, coachId);
  }

  /** A single program for the calm viewer. */
  @Get('programs/:id')
  program(@CurrentUser('id') studentId: string, @Param('id') id: string) {
    return this.students.getProgramForStudent(studentId, id);
  }
}
