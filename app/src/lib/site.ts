import { routing } from '@/i18n/routing';

/**
 * Canonical public origin used for SEO (metadataBase, canonical URLs, sitemap,
 * robots, OG tags). Set NEXT_PUBLIC_SITE_URL to your real domain in production —
 * everything downstream (sitemap, alternates, JSON-LD) derives from this.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fitlo.app').replace(/\/$/, '');

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
