'use client';

import * as React from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardShell } from '@/components/shared/dashboard-shell';
import { AdminNav } from './admin-nav';

/** Auth gate (ADMIN only) + app chrome + section nav for the owner panel. */
export function AdminPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="ADMIN">
      <DashboardShell>
        <AdminNav />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
