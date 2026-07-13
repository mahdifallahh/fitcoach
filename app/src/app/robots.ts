import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Allow crawling of public marketing/coach pages; keep app & private areas out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/coach/', // coach dashboard (auth-gated)
        '/*/student/', // student dashboard (auth-gated)
        '/*/admin', // owner panel (auth-gated)
        '/*/login',
        '/*/c/*/request', // intake form (auth-gated, per-submission)
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
