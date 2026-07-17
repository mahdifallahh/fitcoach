import type { MetadataRoute } from 'next';
import { LOCALES, languageAlternatesOn, localeUrlOn, resolveOrigin } from '@/lib/site';
import { POSTS } from '@/lib/blog';

// Evaluated per request (not frozen at build): coach pages come from the DB,
// `next build` runs without one, and the origin is read from the live request.
export const dynamic = 'force-dynamic';

/** Public, indexable pages only (marketing + blog + coach public pages). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Resolve the origin from the actual request — every <loc> must share the
  // host the sitemap is served from, or Search Console rejects it. This makes
  // the sitemap correct even if the build-time NEXT_PUBLIC_SITE_URL was wrong.
  const base = await resolveOrigin();
  const url = (locale: string, path: string) => localeUrlOn(base, locale, path);
  const alts = (path: string) => ({ languages: languageAlternatesOn(base, path) });

  // Root redirect → default locale.
  entries.push({ url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 });

  const staticPaths = ['', '/about', '/blog', '/terms', '/privacy'];
  for (const path of staticPaths) {
    for (const locale of LOCALES) {
      entries.push({
        url: url(locale, path),
        lastModified: now,
        changeFrequency: path === '' ? 'weekly' : 'daily',
        priority: path === '' ? 0.9 : 0.7,
        alternates: alts(path),
      });
    }
  }

  for (const post of POSTS) {
    const path = `/blog/${post.slug}`;
    for (const locale of LOCALES) {
      entries.push({
        url: url(locale, path),
        lastModified: new Date(post.date),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: alts(path),
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
          url: url(locale, path),
          lastModified: coach.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: alts(path),
        });
      }
    }
  } catch {
    // DB unavailable — serve the static portion.
  }

  return entries;
}
