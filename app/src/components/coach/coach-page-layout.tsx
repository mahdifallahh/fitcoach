"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { CoachNav } from "./coach-nav";
import { SubscriptionBanner } from "./subscription-banner";

/** Wraps every coach page: auth gate + app chrome + section nav + plan banner. */
export function CoachPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="COACH">
      <DashboardShell>
        <CoachNav />
        <SubscriptionBanner />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
