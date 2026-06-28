'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ProgramList } from '@/components/coach/program-list';

export default function CoachProgramsPage() {
  return (
    <CoachPageLayout>
      <ProgramList />
    </CoachPageLayout>
  );
}
