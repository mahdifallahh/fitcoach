'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { LogoutButton } from '@/components/auth/logout-button';

/** Shared app chrome for authenticated panels (header + content container). */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const tc = useTranslations('common');
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <span className="text-lg font-bold text-primary">{tc('appName')}</span>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="container flex-1 py-6">{children}</main>
    </div>
  );
}
