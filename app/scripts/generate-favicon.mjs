/**
 * Generate a real multi-size favicon.ico from the brand SVG (public/icons/icon.svg)
 * and write it to src/app/favicon.ico — Next then serves it at /favicon.ico and
 * injects the <link>. Google needs a crawlable, square favicon (a multiple of
 * 48px) to show a site icon in results; a root favicon.ico is the most reliable.
 *
 * Run inside the app container (Chromium present):
 *   docker compose exec app node scripts/generate-favicon.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8');
const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const SIZES = [16, 32, 48, 64];

const { default: puppeteer } = await import('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});

const pngs = [];
for (const size of SIZES) {
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px}
     img{width:${size}px;height:${size}px;display:block}</style></head>
     <body><img src="${svgDataUri}"></body></html>`,
    { waitUntil: 'networkidle0' },
  );
  const buf = await page.screenshot({ type: 'png', omitBackground: true });
  pngs.push({ size, buf });
  await page.close();
}
await browser.close();

// Pack the PNGs into an .ico (ICONDIR + entries + PNG payloads).
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  const payloads = [];
  let offset = 6 + images.length * 16;
  for (const { size, buf } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 => 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8); // size of PNG data
    e.writeUInt32LE(offset, 12); // offset
    offset += buf.length;
    entries.push(e);
    payloads.push(buf);
  }
  return Buffer.concat([header, ...entries, ...payloads]);
}

const ico = buildIco(pngs);
writeFileSync(path.join(root, 'src/app/favicon.ico'), ico);
console.log('wrote src/app/favicon.ico', ico.length, 'bytes,', SIZES.join('/'), 'px');
