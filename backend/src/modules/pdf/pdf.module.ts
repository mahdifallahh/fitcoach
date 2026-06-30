import { Module } from '@nestjs/common';
import { ProgramsModule } from '../programs/programs.module';
import { StudentsModule } from '../students/students.module';
import { PdfController } from './pdf.controller';
import { StudentPdfController } from './student-pdf.controller';
import { PdfService } from './pdf.service';

@Module({
  imports: [ProgramsModule, StudentsModule],
  controllers: [PdfController, StudentPdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
