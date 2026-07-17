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
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitlo.ir').replace(/\/$/, '');

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i;

// A production deploy that still resolves to a local/loopback origin means
// NEXT_PUBLIC_SITE_URL wasn't actually applied on the server (a stray
// `.env.local` on the host, or the hosting panel's env value never got set) —
// every generated URL (sitemap, canonical, OG, JSON-LD) silently ends up
// pointing at localhost. Surface it loudly in server logs instead of letting
// it ship unnoticed until, say, Search Console flags the sitemap.
/** One-time production warning when the baked origin is a localhost value. */
function warnIfLocalOriginOnce() {
  const g = globalThis as { __fitloSiteUrlWarned?: boolean };
  if (g.__fitloSiteUrlWarned || process.env.NODE_ENV !== 'production') return;
  g.__fitloSiteUrlWarned = true;
  // eslint-disable-next-line no-console
  console.error(
    `[fitlo] NEXT_PUBLIC_SITE_URL is "${SITE_URL}" in production. ` +
      'Set it to the real public domain (e.g. https://fitlo.ir) in the server env and REBUILD — ' +
      'canonical tags, OG images and JSON-LD are baked at build time and are currently wrong. ' +
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
