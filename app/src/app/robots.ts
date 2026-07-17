import type { MetadataRoute } from 'next';
import { resolveOrigin } from '@/lib/site';

// Read the origin from the live request so the sitemap URL + host match the
// domain robots.txt is served from, even if the build-time env was wrong.
export const dynamic = 'force-dynamic';

/** Private, auth-gated areas — out of every index. */
const PRIVATE_PATHS = [
  '/api/',
  '/*/coach/', // coach dashboard (auth-gated)
  '/*/student/', // student dashboard (auth-gated)
  '/*/admin', // owner panel (auth-gated)
  '/*/login',
  '/*/launch', // installed-PWA entry screen (no indexable content)
  '/*/c/*/request', // intake form (auth-gated, per-submission)
];

/**
 * AI answer-engine crawlers, allowed explicitly (GEO): being cited by
 * ChatGPT/Claude/Perplexity/Gemini answers is a distribution channel, and an
 * explicit rule keeps them allowed even if the default rule tightens later.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

/** Allow crawling of public marketing/coach pages; keep app & private areas out of the index. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await resolveOrigin();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
