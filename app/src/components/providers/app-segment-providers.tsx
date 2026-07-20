import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTimeZone } from 'next-intl/server';
import { QueryProvider } from './query-provider';

/**
 * Provider tree for the authenticated app segments (coach/student/admin/login).
 * Two things the public marketing surface deliberately does without:
 *   1. the **full** message catalog — the root layout only ships the small
 *      public subset (`i18n/client-messages.ts`); this re-provides everything.
 *   2. **react-query** (`QueryProvider`, ~45 KB) — only the panels + the login
 *      form call query hooks, so it never reaches the landing/blog/coach-public
 *      bundles.
 * Theme + Toaster stay global (in `AppProviders`), so they're not repeated here.
 */
export async function AppSegmentProviders({ children }: { children: React.ReactNode }) {
  const [locale, messages, timeZone] = await Promise.all([
    getLocale(),
    getMessages(),
    getTimeZone(),
  ]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <QueryProvider>{children}</QueryProvider>
    </NextIntlClientProvider>
  );
}
