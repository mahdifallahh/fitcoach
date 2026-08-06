"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { CoachBottomNav, CoachNav } from "./coach-nav";
import { SubscriptionBanner } from "./subscription-banner";

/** Wraps every coach page: auth gate + app chrome + section nav + plan banner. */
export function CoachPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="COACH">
      <DashboardShell>
        <CoachNav />
        <SubscriptionBanner />
        {/* The bottom bar is fixed, so it floats over the end of the page.
            This reserves its height (plus the iOS home indicator) back, or the
            last row of every list would sit permanently underneath it. */}
        <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </div>
        <CoachBottomNav />
      </DashboardShell>
    </AuthGuard>
  );
}
