import type { MetadataRoute } from 'next';
import { LOCALES, SITE_URL, languageAlternates, localeUrl } from '@/lib/site';
import { POSTS } from '@/lib/blog';

// Evaluated per request (not frozen at build): coach pages come from the DB,
// and `next build` runs without a database.
export const dynamic = 'force-dynamic';

/** Public, indexable pages only (marketing + blog + coach public pages). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Coach public pages (/c/<handle>) — each coach's link-in-bio page is indexable.
  // Soft-fail: a DB hiccup should degrade to the static entries, not break the sitemap.
  try {
    const { getPrisma } = await import('@/server/container');
    const coaches = await getPrisma().coachProfile.findMany({
      where: { handle: { not: null } },
      select: { handle: true, updatedAt: true },
    });
    for (const coach of coaches) {
      const path = `/c/${coach.handle}`;
      for (const locale of LOCALES) {
        entries.push({
          url: localeUrl(locale, path),
          lastModified: coach.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable — serve the static portion.
  }

  return entries;
}
