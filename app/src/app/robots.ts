import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

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
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
