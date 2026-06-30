import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PdfService } from './pdf.service';

@ApiTags('pdf')
@Roles(Role.STUDENT)
@Controller('student/programs/:id/pdf')
export class StudentPdfController {
  constructor(private readonly pdf: PdfService) {}

  @Get()
  generate(
    @CurrentUser('id') studentId: string,
    @Param('id') id: string,
    @Query('locale') locale?: string,
  ) {
    return this.pdf.getOrGenerateForStudent(studentId, id, locale === 'en' ? 'en' : 'fa');
  }
}
