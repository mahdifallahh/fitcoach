'use client';

import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { OverviewView } from '@/components/admin/overview-view';

export default function AdminPage() {
  return (
    <AdminPageLayout>
      <OverviewView />
    </AdminPageLayout>
  );
}
