'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { RequestsInbox } from '@/components/coach/requests-inbox';

export default function CoachRequestsPage() {
  return (
    <CoachPageLayout>
      <RequestsInbox />
    </CoachPageLayout>
  );
}
