"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { StudentNav } from "./student-nav";

/** Auth gate + app chrome + section nav for student pages. */
export function StudentPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="STUDENT">
      <DashboardShell>
        <StudentNav />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
