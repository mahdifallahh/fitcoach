import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

/**
 * Canonical public origin used for SEO (metadataBase, canonical URLs, sitemap,
 * robots, OG tags). Set NEXT_PUBLIC_SITE_URL to your real domain in production —
 * everything downstream (sitemap, alternates, JSON-LD) derives from this.
 *
 * ⚠️ `NEXT_PUBLIC_*` is inlined at BUILD time, so this constant is frozen when
 * `next build` runs. If the build env is wrong, `SITE_URL` is wrong everywhere.
 * For per-request routes (sitemap/robots) prefer `resolveOrigin()`, which falls
 * back to the actual request host so those never emit localhost URLs.
 */
const FALLBACK_SITE_URL = 'https://fitlo.ir';
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i;

const RAW_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

// `NEXT_PUBLIC_*` is inlined at BUILD time. If a *production* build picks up a
// localhost origin — a stray `.env.local` copied into the build, or a mis-set
// hosting env panel — every prerendered canonical/hreflang/OG tag ships pointing
// at localhost, which tells Google the real domain is a duplicate of a dead host
// (and fails Lighthouse's rel=canonical audit). So in a production build we
// *reject* a loopback origin and fall back to the real domain rather than baking
// the bad value. Dev builds keep localhost (handy for local canonical checks).
const BAKED_LOCAL_IN_PROD = process.env.NODE_ENV === 'production' && LOCAL_ORIGIN.test(RAW_SITE_URL);

export const SITE_URL = !RAW_SITE_URL || BAKED_LOCAL_IN_PROD ? FALLBACK_SITE_URL : RAW_SITE_URL;

if (BAKED_LOCAL_IN_PROD) {
  // eslint-disable-next-line no-console
  console.error(
    `[fitlo] NEXT_PUBLIC_SITE_URL was "${RAW_SITE_URL}" during a production build — ` +
      `overriding to "${FALLBACK_SITE_URL}" so canonical/OG/JSON-LD don't ship localhost URLs. ` +
      'Set NEXT_PUBLIC_SITE_URL to the real public domain in the build env to silence this.',
  );
}

// A production deploy whose baked origin still looks local means the override
// above didn't have a real domain to use either. Surface it loudly in server
// logs instead of letting it ship unnoticed until Search Console flags it.
/** One-time production warning when the resolved origin is still a localhost value. */
function warnIfLocalOriginOnce() {
  const g = globalThis as { __fitloSiteUrlWarned?: boolean };
  if (g.__fitloSiteUrlWarned || process.env.NODE_ENV !== 'production') return;
  g.__fitloSiteUrlWarned = true;
  // eslint-disable-next-line no-console
  console.error(
    `[fitlo] SITE_URL resolved to "${SITE_URL}" in production. ` +
      'Set NEXT_PUBLIC_SITE_URL to the real public domain (e.g. https://fitlo.ir) and REBUILD — ' +
      'canonical tags, OG images and JSON-LD are baked at build time. ' +
      '(sitemap/robots self-correct from the request host, so those stay valid.)',
  );
}

export const SITE_NAME = 'fitlo';

export const DEFAULT_LOCALE = routing.defaultLocale;
export const LOCALES = routing.locales;

/**
 * The public origin for the *current request*. Prefers a correctly-configured
 * build-time `SITE_URL`, but if that's missing or a localhost value (a
 * misconfigured build), it falls back to the request's own host — so
 * per-request routes like the sitemap and robots always emit URLs on the exact
 * domain they were served from. That origin-match is precisely what Search
 * Console enforces ("URL not allowed" when a sitemap lists a different host).
 */
export async function resolveOrigin(): Promise<string> {
  if (SITE_URL && !LOCAL_ORIGIN.test(SITE_URL)) return SITE_URL;
  warnIfLocalOriginOnce(); // baked origin is localhost — surface it, then self-correct below
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      // A real public domain is always served over https (Search Console fetches
      // over https, so an http `<loc>` would still be an origin mismatch). Only
      // localhost stays on the forwarded/plain scheme for dev.
      const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host);
      const proto = isLocalHost
        ? (h.get('x-forwarded-proto')?.split(',')[0].trim() ?? 'http')
        : 'https';
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  } catch {
    // headers() unavailable (e.g. static generation) — fall through.
  }
  return SITE_URL;
}

/** Absolute URL for a locale-prefixed path (e.g. localeUrl('en', '/blog') → https://…/en/blog). */
export function localeUrl(locale: string, path = ''): string {
  return localeUrlOn(SITE_URL, locale, path);
}

/** Like `localeUrl` but against an explicit origin (from `resolveOrigin()`). */
export function localeUrlOn(base: string, locale: string, path = ''): string {
  const clean = path && !path.startsWith('/') ? `/${path}` : path;
  return `${base}/${locale}${clean}`;
}

/**
 * The `alternates.languages` map (hreflang) for a given path, plus x-default.
 * Google uses this to serve the right language variant per user.
 */
export function languageAlternates(path = ''): Record<string, string> {
  return languageAlternatesOn(SITE_URL, path);
}

/** Like `languageAlternates` but against an explicit origin (from `resolveOrigin()`). */
export function languageAlternatesOn(base: string, path = ''): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of LOCALES) map[locale] = localeUrlOn(base, locale, path);
  map['x-default'] = localeUrlOn(base, DEFAULT_LOCALE, path);
  return map;
}
