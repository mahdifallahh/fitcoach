'use client';

import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { CoachesView } from '@/components/admin/coaches-view';

export default function AdminCoachesPage() {
  return (
    <AdminPageLayout>
      <CoachesView />
    </AdminPageLayout>
  );
}
