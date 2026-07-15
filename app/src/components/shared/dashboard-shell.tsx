"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/shared/logo";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";

/** Shared app chrome for authenticated panels (header + content container). */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-6 border-b bg-background/80 px-4 py-3 backdrop-blur">
        <Link href="/" aria-label="fitlo">
          <Logo size="md" priority />
        </Link>
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
