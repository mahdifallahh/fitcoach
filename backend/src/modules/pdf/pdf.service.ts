import { existsSync } from 'node:fs';
import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../config/config.module';
import { StorageService } from '../storage/storage.service';
import { ProgramsService } from '../programs/programs.service';
import { StudentsService } from '../students/students.service';
import { renderProgramHtml, type PdfProgram } from './program-pdf.template';

// puppeteer-core is loaded lazily (see loadPuppeteer) so the backend compiles and
// boots even where the heavy dep / system Chromium isn't installed; only the PDF
// endpoint degrades. Types are intentionally loose to avoid a static dependency.

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: { connected?: boolean; newPage: () => Promise<any>; close: () => Promise<void> } | null = null;
  private launching: Promise<any> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly storage: StorageService,
    private readonly programs: ProgramsService,
    private readonly students: StudentsService,
  ) {}

  /**
   * Student-facing PDF: verify the student owns this published program, then reuse
   * the coach generation path (and its cache).
   */
  async getOrGenerateForStudent(studentUserId: string, programId: string, locale: 'fa' | 'en') {
    const program = await this.students.getProgramForStudent(studentUserId, programId); // 404s if not owned/published
    return this.getOrGenerate(program.coachId, programId, locale);
  }

  /**
   * Returns the program's PDF URL, (re)generating on demand when missing or when
   * `pdfStaleAt` was set by an edit. The result is cached on `Program.pdfUrl`.
   */
  async getOrGenerate(coachId: string, programId: string, locale: 'fa' | 'en') {
    const program = await this.programs.get(coachId, programId); // enforces ownership
    if (program.pdfUrl && !program.pdfStaleAt) {
      return { url: program.pdfUrl, cached: true };
    }

    const coach = await this.prisma.coachProfile.findUnique({
      where: { userId: coachId },
      select: { name: true },
    });
    const html = renderProgramHtml(program as unknown as PdfProgram, coach?.name ?? '', locale);
    const buffer = await this.renderPdf(html);

    const key = `${coachId}/${programId}.pdf`;
    const url = await this.storage.putObject('pdfs', key, buffer, 'application/pdf');
    await this.prisma.program.update({
      where: { id: programId },
      data: { pdfUrl: url, pdfStaleAt: null },
    });
    return { url, cached: false };
  }

  /** Lazily resolve puppeteer-core; throws a clear 503 if it's not installed. */
  private async loadPuppeteer(): Promise<any> {
    const spec = 'puppeteer-core'; // non-literal specifier → not statically required at compile time
    try {
      const mod: any = await import(spec);
      return mod.default ?? mod;
    } catch {
      throw new ServiceUnavailableException({
        code: 'PDF_UNAVAILABLE',
        message: 'PDF rendering is not available on this server',
      });
    }
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<div style="width:100%;font-size:9px;color:#94a3b8;text-align:center;">' +
          '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  /** First existing Chromium/Chrome binary (env override first), else undefined. */
  private resolveExecutablePath(): string | undefined {
    const candidates = [
      this.config.get('PUPPETEER_EXECUTABLE_PATH'),
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ].filter(Boolean) as string[];
    return candidates.find((p) => existsSync(p));
  }

  private async getBrowser(): Promise<{ newPage: () => Promise<any> }> {
    if (this.browser?.connected) return this.browser;
    if (this.launching) return this.launching;

    const executablePath = this.resolveExecutablePath();
    if (!executablePath) {
      throw new ServiceUnavailableException({
        code: 'PDF_UNAVAILABLE',
        message: 'PDF rendering is unavailable: no Chromium binary found on the server.',
      });
    }

    this.launching = this.loadPuppeteer()
      .then((puppeteer) =>
        puppeteer.launch({
          executablePath,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none',
          ],
        }),
      )
      .then((b: any) => {
        this.browser = b;
        this.launching = null;
        this.logger.log(`Chromium launched for PDF rendering (${executablePath})`);
        return b;
      })
      .catch((e) => {
        this.launching = null;
        this.logger.error(`Chromium launch failed: ${e?.message ?? e}`);
        throw new ServiceUnavailableException({
          code: 'PDF_UNAVAILABLE',
          message: 'PDF rendering is temporarily unavailable on this server.',
        });
      });
    return this.launching;
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
  }
}
