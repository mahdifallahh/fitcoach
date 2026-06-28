import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PdfService } from './pdf.service';

@ApiTags('pdf')
@Roles(Role.COACH)
@Controller('coach/programs/:id/pdf')
export class PdfController {
  constructor(private readonly pdf: PdfService) {}

  @Get()
  generate(
    @CurrentUser('id') coachId: string,
    @Param('id') id: string,
    @Query('locale') locale?: string,
  ) {
    return this.pdf.getOrGenerate(coachId, id, locale === 'en' ? 'en' : 'fa');
  }
}
