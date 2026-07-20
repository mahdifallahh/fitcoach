import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTimeZone } from 'next-intl/server';

/**
 * Re-provides the *full* message catalog for the authenticated app segments
 * (coach/student/admin/login). The root locale layout only ships the small
 * public-page subset (see `i18n/client-messages.ts`); this nested provider
 * overrides it for the panels, whose client components use most namespaces.
 * Theme/query/toaster context from `AppProviders` is inherited untouched.
 */
export async function FullIntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, messages, timeZone] = await Promise.all([
    getLocale(),
    getMessages(),
    getTimeZone(),
  ]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
