import "server-only";
import { NextResponse } from "next/server";

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
<style>@page { size: A4; margin: 14mm 12mm 16mm; }</style>
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
export function printableHtmlResponse(html: string): NextResponse {
  return new NextResponse(html.replace("</body>", `${AUTO_PRINT}</body>`), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The document is one student's program — never let a shared cache keep it.
      "Cache-Control": "private, no-store",
    },
  });
}
