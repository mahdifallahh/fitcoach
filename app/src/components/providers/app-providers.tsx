"use client";

import * as React from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { Toaster } from "sonner";
import { ThemeProvider } from "./theme-provider";

interface AppProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string;
}

/**
 * Global client provider tree for **every** page: i18n (public subset) + theme +
 * toasts. React-query is deliberately NOT here — only the authenticated panels +
 * /login fetch data, so `QueryProvider` is mounted in those segment layouts
 * (`components/providers/app-segment-providers.tsx`) instead of shipping its
 * ~45 KB to the marketing/blog/coach-public pages that never call a query hook.
 * Toaster stays global because the public intake form (`/c/<handle>/request`)
 * raises toasts.
 */
export function AppProviders({
  children,
  locale,
  messages,
  timeZone,
}: AppProvidersProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        {/* bottom-center, not top-center: this is a mobile-first app and the
            coach panel has a sticky header + nav tabs, so a toast at the top
            landed behind them — the confirmation fired but was never seen.
            The bottom is clear, and closer to the thumb for the close button. */}
        <Toaster richColors closeButton position="bottom-center" duration={4000} />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
