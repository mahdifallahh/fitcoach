'use client';

import * as React from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/shared/dashboard-shell';

/** Auth gate + app chrome for student pages. */
export function StudentPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="STUDENT">
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
