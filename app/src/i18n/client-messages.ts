import type { AbstractIntlMessages } from 'next-intl';

/**
 * Message namespaces needed by *client* components on the public surface
 * (landing, about, blog, terms/privacy, /c/<handle> + its request form, launch).
 *
 * The locale layout used to hand the entire messages catalog (~30 KB of JSON)
 * to `NextIntlClientProvider` on every page — Lighthouse billed that against the
 * landing page as serialized RSC payload + hydration work. Public pages now get
 * only this subset; the app segments (coach/student/admin/login) re-provide the
 * full catalog via their own layouts (`AppSegmentProviders`).
 *
 * When you add a `useTranslations('<ns>')` call to a component reachable from a
 * public page, add its namespace here — a miss surfaces as a loud
 * MISSING_MESSAGE error in dev, not a silent fallback.
 */
export const PUBLIC_CLIENT_NAMESPACES = [
  'common',
  'footer',
  'forms',
  'landing',
  'launch',
  'pwa',
  'request',
] as const;

/** Shallow namespace pick — the catalog is one level of namespaces deep. */
export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const ns of namespaces) {
    if (ns in messages) out[ns] = messages[ns];
  }
  return out;
}
