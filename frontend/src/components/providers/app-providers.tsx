'use client';

import * as React from 'react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Toaster } from 'sonner';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';

interface AppProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string;
}

/** Single client-side provider tree: i18n + theme + react-query + toasts. */
export function AppProviders({ children, locale, messages, timeZone }: AppProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-center" />
        </QueryProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
