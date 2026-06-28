# ADR 0003 — Puppeteer for PDF generation

**Status:** Accepted

## Context
Programs export to a PDF covering Day 1..N with exercise name, sets, reps, description, and **superset
grouping**, generated **server-side**. Content is **Persian (RTL)** with a custom webfont. The brief lists
Puppeteer/Playwright (HTML template) or `@react-pdf/renderer` as options.

## Decision
Render a styled **HTML/CSS template with Puppeteer** (headless Chromium) and print to PDF.

## Rationale
- **RTL + shaping:** Chromium has first-class bidi/RTL text shaping and `@font-face` support, so Persian
  renders correctly with Vazirmatn — the weakest area for `@react-pdf/renderer`.
- **Layout fidelity:** we reuse familiar HTML/CSS (even Tailwind-like classes) for superset boxes, day
  sections, and tables; complex layouts are far easier than react-pdf's flex subset.
- **Consistency:** the PDF can visually echo the on-screen program viewer.

## Trade-offs / consequences
- The backend image must bundle Chromium → larger image and more memory. Mitigated by a multi-stage
  Dockerfile installing only the required Chromium deps, and by running generation in a **BullMQ worker**
  (off the request path) with a singleton browser instance.
- Generated PDFs are uploaded to S3 and cached on `Program.pdfUrl`; regenerated when the program changes
  (`pdfStaleAt`).
