import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
// Type-only: erased at compile time, so this never pulls Chromium into the bundle.
import type { Browser, Page } from "puppeteer-core";
import { AppConfig } from "../config";
import { StorageService } from "../storage";
import { ProgramsService } from "../programs/service";
import { StudentsService } from "../students/service";
import { isAppError, ServiceUnavailableException } from "../http/errors";
import { renderProgramHtml, type PdfLogo, type PdfProgram } from "./template";

export type PdfLocale = "fa" | "en";

/**
 * Puppeteer renders the PDF from an HTML string via `setContent`, which has no base
 * URL — so a relative `/brand/logo.png` would never resolve. Inline the brand assets
 * as base64 data URIs instead. Read once per process; a missing file degrades to a
 * logo-less PDF rather than failing the whole render.
 */
let logoCache: PdfLogo | null | undefined;

function loadLogo(): PdfLogo | undefined {
  if (logoCache === undefined) {
    try {
      const read = (file: string) =>
        `data:image/png;base64,${readFileSync(
          join(process.cwd(), "public", "brand", file),
        ).toString("base64")}`;
      logoCache = { mark: read("logo-mark.png"), wordmark: read("logo-wordmark.png") };
    } catch (e) {
      console.error("[pdf] brand logo not found, rendering without it:", (e as Error).message);
      logoCache = null;
    }
  }
  return logoCache ?? undefined;
}

/**
 * Where a headless Chrome/Chromium/Edge normally lives, per platform. Pure (platform
 * and env are arguments) so it can be unit-tested without touching the real host.
 *
 * The Windows and macOS entries are what make a native `pnpm dev` able to render:
 * the shared `.env` sets `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` for the Linux
 * container, which simply doesn't exist on a developer's machine. Any browser in this
 * list is Chromium-based, which is all `puppeteer-core` requires.
 */
export function chromeCandidates(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (platform === "win32") {
    const roots = [
      env.PROGRAMFILES,
      env["PROGRAMFILES(X86)"],
      env.LOCALAPPDATA,
    ].filter((r): r is string => !!r);
    return roots.flatMap((root) => [
      `${root}\\Google\\Chrome\\Application\\chrome.exe`,
      `${root}\\Chromium\\Application\\chrome.exe`,
      `${root}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ]);
  }
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }
  return [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/microsoft-edge",
  ];
}

/** Chromium flags: `--no-sandbox` because the container runs as root. */
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--font-render-hinting=none",
];

export class PdfService {
  /** Reused across requests — launching Chromium costs ~1–2s. */
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly storage: StorageService,
    private readonly programs: ProgramsService,
    private readonly students: StudentsService,
  ) {}

  /**
   * Student-facing PDF: verify the student owns this published program, then reuse
   * the coach generation path (and its cache).
   */
  async getOrGenerateForStudent(
    studentUserId: string,
    programId: string,
    locale: PdfLocale,
  ) {
    const program = await this.students.getProgramForStudent(
      studentUserId,
      programId,
    ); // 404s if not owned/published
    return this.getOrGenerate(program.coachId, programId, locale);
  }

  /**
   * Returns the program's PDF URL, (re)generating on demand when missing, when
   * `pdfStaleAt` was set by an edit, or when the cached file is in the *other*
   * locale. The result is cached on `Program.pdfUrl`.
   */
  async getOrGenerate(coachId: string, programId: string, locale: PdfLocale) {
    const program = await this.programs.get(coachId, programId); // enforces ownership
    const key = `${coachId}/${programId}-${locale}.pdf`;
    const url = this.storage.publicUrl("pdfs", key);

    // `pdfUrl` records the last *generated* locale, so a hit requires the stored URL
    // to be the one this locale would produce — otherwise an English download would
    // hand back the Persian, right-to-left file. Rows written before the key carried
    // a locale never match, so they re-render once and then behave normally.
    if (program.pdfUrl === url && !program.pdfStaleAt) {
      return { url, cached: true };
    }

    const coach = await this.prisma.coachProfile.findUnique({
      where: { userId: coachId },
      select: { name: true },
    });
    const html = renderProgramHtml(
      program as unknown as PdfProgram,
      coach?.name ?? "",
      locale,
      loadLogo(),
    );
    const buffer = await this.renderPdf(html);

    await this.storage.putObject("pdfs", key, buffer, "application/pdf");
    await this.prisma.program.update({
      where: { id: programId },
      data: { pdfUrl: url, pdfStaleAt: null },
    });
    return { url, cached: false };
  }

  // ── Chromium ──────────────────────────────────────────────────────────────

  /**
   * Lazily resolve puppeteer-core. The specifier is a literal so Next's output
   * tracing copies the package into the standalone production build;
   * `serverExternalPackages` keeps it out of the webpack bundle, and the import
   * still only runs on the first PDF request, so a server without the dependency
   * boots fine and only this endpoint degrades.
   */
  private async loadPuppeteer() {
    try {
      const mod = await import("puppeteer-core");
      return mod.default ?? mod;
    } catch (e) {
      console.error("[pdf] puppeteer-core is not installed:", (e as Error).message);
      throw new ServiceUnavailableException({
        code: "PDF_UNAVAILABLE",
        message: "PDF rendering is not available on this server",
      });
    }
  }

  /** First Chromium-based binary that exists (env override first), else undefined. */
  private resolveExecutablePath(): string | undefined {
    // A configured path that isn't on disk is ignored rather than fatal: one .env is
    // shared by the Linux container and native Windows/macOS dev runs.
    const configured = this.config.get("PUPPETEER_EXECUTABLE_PATH");
    return [configured, ...chromeCandidates(process.platform)].find(
      (p): p is string => !!p && existsSync(p),
    );
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;
    this.browser = null; // handle from a crashed/closed Chromium — don't reuse it
    if (this.launching) return this.launching;

    const executablePath = this.resolveExecutablePath();
    if (!executablePath) {
      throw new ServiceUnavailableException({
        code: "PDF_UNAVAILABLE",
        message:
          "PDF rendering is unavailable: no Chrome or Chromium binary was found. " +
          "Install one, or point PUPPETEER_EXECUTABLE_PATH at it.",
      });
    }

    this.launching = this.loadPuppeteer()
      .then((puppeteer) =>
        puppeteer.launch({ executablePath, headless: true, args: LAUNCH_ARGS }),
      )
      .then((browser) => {
        this.browser = browser;
        // Chromium can die on its own (OOM, host restart); forget it when it does so
        // the next request launches a fresh one instead of using a dead handle.
        browser.on("disconnected", () => {
          if (this.browser === browser) this.browser = null;
        });
        console.log(`[pdf] Chromium launched for PDF rendering (${executablePath})`);
        return browser;
      })
      .catch((e) => {
        if (isAppError(e)) throw e; // already a clean 503
        console.error(`[pdf] Chromium launch failed: ${e?.message ?? e}`);
        throw new ServiceUnavailableException({
          code: "PDF_UNAVAILABLE",
          message: "PDF rendering is temporarily unavailable on this server.",
        });
      })
      .finally(() => {
        this.launching = null;
      });

    return this.launching;
  }

  /** Drop the pooled browser, closing it best-effort. */
  private async discardBrowser(): Promise<void> {
    const browser = this.browser;
    this.browser = null;
    await browser?.close().catch(() => undefined);
  }

  private async renderPdf(html: string): Promise<Buffer> {
    try {
      return await this.renderOnce(html);
    } catch (err) {
      // A 503 we raised ourselves (no binary / no dependency) is final — retrying
      // can't help. Anything else may be a browser that died between requests, so
      // drop it and give the render one clean attempt on a fresh Chromium.
      if (isAppError(err)) throw err;
      console.warn("[pdf] render failed, retrying on a fresh browser:", err);
      await this.discardBrowser();
      try {
        return await this.renderOnce(html);
      } catch (retryErr) {
        if (isAppError(retryErr)) throw retryErr;
        console.error("[pdf] render failed after retry:", retryErr);
        throw new ServiceUnavailableException({
          code: "PDF_RENDER_FAILED",
          message: "The PDF could not be rendered. Please try again.",
        });
      }
    }
  }

  private async renderOnce(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page: Page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate:
          '<div style="width:100%;font-size:9px;color:#94a3b8;text-align:center;">' +
          '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }
}
