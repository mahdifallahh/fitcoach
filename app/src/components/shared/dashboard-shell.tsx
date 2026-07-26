"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/shared/logo";
import { ProfileMenu } from "@/components/shared/profile-menu";

/**
 * Shared app chrome for authenticated panels (header + content container).
 *
 * The header is deliberately two elements wide — brand and profile menu. It
 * previously lined up five controls (role, install, locale, theme, logout), two
 * of them with text labels, which wrapped on phones and squeezed the logo; those
 * all live inside `ProfileMenu` now. `shrink-0` on the brand keeps the lockup at
 * its intended size regardless of what shares the row.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2.5 backdrop-blur">
        <Link href="/" aria-label="fitlo" className="shrink-0">
          <Logo size="md" priority />
        </Link>
        <ProfileMenu />
      </header>
      <main className="container flex-1 py-6">{children}</main>
    </div>
  );
}
