/**
 * Generates a branded 1200×630 hero image per blog post → public/blog/<slug>.png.
 * These double as each post's Open Graph image and Article JSON-LD image (both
 * great for SEO). Runs inside the app container (Chromium present):
 *   docker compose exec app node scripts/generate-blog-heroes.mjs
 * Re-run after adding a post or rebranding.
 *
 * Titles are duplicated here (kept short) so this script has no TS/build deps.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => readFileSync(path.join(root, p)).toString('base64');

// slug → Persian hero heading (concise; the fa title is the primary audience)
const HEROES = [
  { slug: 'getting-started-online-coaching', title: 'شروع مربیگری آنلاین از صفر', kicker: 'راهنمای مربیان' },
  { slug: 'write-better-training-programs', title: 'برنامه‌ای بنویس که شاگرد انجامش بدهد', kicker: 'برنامه‌نویسی' },
  { slug: 'supersets-explained', title: 'سوپرست به زبان ساده', kicker: 'تکنیک تمرین' },
  { slug: 'grow-with-a-public-link', title: 'لینک بیو را به جذب شاگرد تبدیل کن', kicker: 'رشد و بازاریابی' },
];

const markB64 = b64('public/brand/logo-mark.png');
const wordB64 = b64('public/brand/logo-wordmark.png');

const html = (h) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; padding: 80px; display: flex; flex-direction: column;
    justify-content: space-between; direction: rtl;
    background:
      radial-gradient(ellipse 80% 60% at 100% 0%, rgba(37,99,235,.30), transparent),
      radial-gradient(ellipse 70% 60% at 0% 100%, rgba(37,99,235,.20), transparent),
      #0b1220;
    font-family: 'Noto Sans Arabic', sans-serif; color: #f8fafc;
  }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .kicker { font-size: 26px; font-weight: 700; color: #93c5fd;
    background: rgba(37,99,235,.18); padding: 8px 22px; border-radius: 999px; }
  .lockup { display: flex; align-items: center; gap: 8px; direction: ltr; }
  .lockup img.mark { height: 56px; }
  .lockup img.word { height: 46px; }
  h1 { font-size: 72px; font-weight: 800; line-height: 1.25; max-width: 900px; text-wrap: balance; }
  .bar { height: 10px; width: 140px; border-radius: 999px; background: #2563eb; }
</style></head><body>
  <div class="top">
    <span class="kicker">${h.kicker}</span>
    <div class="lockup">
      <img class="mark" src="data:image/png;base64,${markB64}">
      <img class="word" src="data:image/png;base64,${wordB64}">
    </div>
  </div>
  <div>
    <div class="bar"></div>
    <h1>${h.title}</h1>
  </div>
</body></html>`;

const { default: puppeteer } = await import('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});
mkdirSync(path.join(root, 'public/blog'), { recursive: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

for (const h of HEROES) {
  await page.setContent(html(h), { waitUntil: 'load' });
  const png = await page.screenshot({ type: 'png' });
  writeFileSync(path.join(root, `public/blog/${h.slug}.png`), png);
  console.log(`wrote public/blog/${h.slug}.png (${png.length} bytes)`);
}
await browser.close();
