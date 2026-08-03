import "server-only";
import { NextResponse } from "next/server";
import { isAppError } from "../http/errors";

/**
 * Sentences, not codes — this page is the whole response, so it has to explain
 * itself. Kept here rather than in `messages/*.json` because a Route Handler
 * lives outside the `[locale]` segment and has no next-intl context to read.
 */
const PRINT_ERRORS: Record<string, { fa: string; en: string }> = {
  UNAUTHENTICATED: {
    fa: "برای دیدن این برنامه باید وارد حساب‌ات شوی. این صفحه را ببند، وارد شو و دوباره امتحان کن.",
    en: "Sign in to view this program, then try again.",
  },
  FORBIDDEN_ROLE: {
    fa: "این برنامه به حساب تو مربوط نیست.",
    en: "This program does not belong to your account.",
  },
  PROGRAM_NOT_FOUND: {
    fa: "این برنامه پیدا نشد. ممکن است حذف شده باشد یا هنوز منتشر نشده باشد.",
    en: "Program not found. It may have been deleted, or not published yet.",
  },
  INTERNAL_ERROR: {
    fa: "الان نتوانستیم این برنامه را آماده کنیم. چند لحظه بعد دوباره تلاش کن.",
    en: "We could not prepare this program right now. Please try again shortly.",
  },
};

/**
 * Injected into the print document only — never into the copy Chromium renders.
 *
 * `@page` restates the geometry `page.pdf()` passes as options, so a program
 * printed by the reader's browser comes out with the same A4 margins as one
 * rendered on the server. Printing waits for `document.fonts.ready` because the
 * Persian face and the inlined logo decide the line breaks: firing the dialog
 * before they settle prints a preview of a document that no longer exists.
 */
const AUTO_PRINT = `
<style>
  /* margin:0 is deliberate, and it is the only way to do this.
     Chrome draws its own header (the page URL) and footer (date + page numbers)
     *inside* the @page margin box; there is no CSS to switch them off. Leaving no
     margin leaves them nowhere to render, so the page comes out clean without
     asking every coach to find the "Headers and footers" checkbox. The white
     space they used to provide is given back as body padding below. */
  @page { size: A4; margin: 0; }
  @media print {
    body { padding: 14mm 12mm !important; }
    /* Body padding only applies once, so pages after the first would start hard
       against the paper edge; a per-section top margin keeps them breathing. */
    .day { margin-top: 6mm; }
  }
</style>
<script>
  window.addEventListener('load', function () {
    var print = function () { window.print(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(print, print);
    else print();
  });
</script>`;

/**
 * Serve a program as a self-printing HTML document.
 *
 * This is the fallback for hosts with no Chromium, so it must not pretend to be
 * a file: no attachment disposition, no `.pdf` name. The browser's own print
 * dialog is the renderer, and "Save as PDF" is the reader's choice there.
 */
/**
 * The print route is opened in a tab, so its failures are *pages*, not payloads.
 * Falling through to the JSON envelope would show a coach `{"success":false,…}`
 * where they expected their program — technically correct, useless to read.
 */
export function printableErrorResponse(
  err: unknown,
  locale: "fa" | "en",
): NextResponse {
  const code = isAppError(err) ? err.code : "INTERNAL_ERROR";
  const status = isAppError(err) ? err.status : 500;
  const message = (PRINT_ERRORS[code] ?? PRINT_ERRORS.INTERNAL_ERROR)[locale];
  const dir = locale === "en" ? "ltr" : "rtl";
  return new NextResponse(
    `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(message)}</title>
<style>
  body { font-family: Vazirmatn, Tahoma, system-ui, sans-serif; background: #f8fafc; color: #0f172a;
         display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 32px; max-width: 26rem; text-align: center; }
  p { margin: 0; font-size: 15px; line-height: 1.7; }
</style></head>
<body><div class="card"><p>${escapeHtml(message)}</p></div></body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printableHtmlResponse(html: string): NextResponse {
  return new NextResponse(html.replace("</body>", `${AUTO_PRINT}</body>`), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The document is one student's program — never let a shared cache keep it.
      "Cache-Control": "private, no-store",
    },
  });
}
