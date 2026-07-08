'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { IntakeSettings } from '@/components/coach/intake-settings';

export default function CoachIntakePage() {
  return (
    <CoachPageLayout>
      <IntakeSettings />
    </CoachPageLayout>
  );
}
