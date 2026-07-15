/**
 * One-shot generator for public/og.png (1200×630 Open Graph card).
 * Runs inside the app container where Chromium is installed:
 *   docker compose exec app node scripts/generate-og.mjs
 * Re-run after a rebrand (it reads the brand PNGs from public/brand/).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => readFileSync(path.join(root, p)).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 36px;
    background:
      radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37,99,235,.28), transparent),
      radial-gradient(ellipse 70% 50% at 85% 110%, rgba(37,99,235,.22), transparent),
      #0b1220;
    font-family: 'Noto Sans Arabic', 'Noto Sans', sans-serif; color: #f8fafc;
  }
  .lockup { display: flex; align-items: center; gap: 10px; }
  .lockup img.mark { height: 96px; }
  .lockup img.word { height: 84px; }
  .fa { font-size: 44px; font-weight: 700; direction: rtl; }
  .en { font-size: 26px; color: #94a3b8; letter-spacing: .3px; }
  .chip { margin-top: 8px; padding: 10px 26px; border-radius: 999px;
    background: #2563eb; color: #fff; font-size: 24px; font-weight: 700; direction: rtl; }
</style></head><body>
  <div class="lockup">
    <img class="mark" src="data:image/png;base64,${b64('public/brand/logo-mark.png')}">
    <img class="word" src="data:image/png;base64,${b64('public/brand/logo-wordmark.png')}">
  </div>
  <div class="fa">اپلیکیشن نوشتن و پیگیری برنامه تمرینی</div>
  <div class="en">Coaching &amp; training programs — fitlo.ir</div>
  <div class="chip">مربی هستی؟ رایگان شروع کن</div>
</body></html>`;

const { default: puppeteer } = await import('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
const png = await page.screenshot({ type: 'png' });
await browser.close();

writeFileSync(path.join(root, 'public/og.png'), png);
console.log('wrote public/og.png', png.length, 'bytes');
