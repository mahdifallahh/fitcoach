'use client';

import { Suspense } from 'react';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { BillingView } from '@/components/coach/billing-view';

export default function BillingPage() {
  return (
    <CoachPageLayout>
      <Suspense>
        <BillingView />
      </Suspense>
    </CoachPageLayout>
  );
}
