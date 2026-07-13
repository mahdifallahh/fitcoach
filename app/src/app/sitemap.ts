import type { MetadataRoute } from 'next';
import { LOCALES, SITE_URL, languageAlternates, localeUrl } from '@/lib/site';
import { POSTS } from '@/lib/blog';

/** Public, indexable pages only (marketing + blog). App/coach/student areas are excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Root redirect → default locale.
  entries.push({ url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 });

  const staticPaths = ['', '/about', '/blog'];
  for (const path of staticPaths) {
    for (const locale of LOCALES) {
      entries.push({
        url: localeUrl(locale, path),
        lastModified: now,
        changeFrequency: path === '' ? 'weekly' : 'daily',
        priority: path === '' ? 0.9 : 0.7,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  for (const post of POSTS) {
    const path = `/blog/${post.slug}`;
    for (const locale of LOCALES) {
      entries.push({
        url: localeUrl(locale, path),
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
