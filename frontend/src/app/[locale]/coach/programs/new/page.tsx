'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ProgramBuilder } from '@/components/coach/program-builder/program-builder';

export default function NewProgramPage() {
  return (
    <CoachPageLayout>
      <ProgramBuilder />
    </CoachPageLayout>
  );
}
