import { routing } from '@/i18n/routing';

/**
 * Canonical public origin used for SEO (metadataBase, canonical URLs, sitemap,
 * robots, OG tags). Set NEXT_PUBLIC_SITE_URL to your real domain in production —
 * everything downstream (sitemap, alternates, JSON-LD) derives from this.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitlo.ir').replace(/\/$/, '');

// A production deploy that still resolves to a local/loopback origin means
// NEXT_PUBLIC_SITE_URL wasn't actually applied on the server (a stray
// `.env.local` on the host, or the hosting panel's env value never got set) —
// every generated URL (sitemap, canonical, OG, JSON-LD) silently ends up
// pointing at localhost. Surface it loudly in server logs instead of letting
// it ship unnoticed until, say, Search Console flags the sitemap.
if (process.env.NODE_ENV === 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(SITE_URL)) {
  // eslint-disable-next-line no-console
  console.error(
    `[fitlo] NEXT_PUBLIC_SITE_URL resolved to "${SITE_URL}" in production. ` +
      'Set it to the real public domain (e.g. https://fitlo.ir) in the server env and redeploy — ' +
      'every generated URL (sitemap, canonical tags, OG images, JSON-LD) is currently wrong.',
  );
}

export const SITE_NAME = 'fitlo';

export const DEFAULT_LOCALE = routing.defaultLocale;
export const LOCALES = routing.locales;

/** Absolute URL for a locale-prefixed path (e.g. localeUrl('en', '/blog') → https://…/en/blog). */
export function localeUrl(locale: string, path = ''): string {
  const clean = path && !path.startsWith('/') ? `/${path}` : path;
  return `${SITE_URL}/${locale}${clean}`;
}

/**
 * The `alternates.languages` map (hreflang) for a given path, plus x-default.
 * Google uses this to serve the right language variant per user.
 */
export function languageAlternates(path = ''): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of LOCALES) map[locale] = localeUrl(locale, path);
  map['x-default'] = localeUrl(DEFAULT_LOCALE, path);
  return map;
}
