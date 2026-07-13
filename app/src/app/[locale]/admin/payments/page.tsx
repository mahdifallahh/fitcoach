'use client';

import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { PaymentsView } from '@/components/admin/payments-view';

export default function AdminPaymentsPage() {
  return (
    <AdminPageLayout>
      <PaymentsView />
    </AdminPageLayout>
  );
}
