'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ProgramBuilder } from '@/components/coach/program-builder/program-builder';

function NewProgram() {
  const student = useSearchParams().get('student') ?? undefined;
  return <ProgramBuilder initialContact={student} />;
}

export default function NewProgramPage() {
  return (
    <CoachPageLayout>
      <Suspense>
        <NewProgram />
      </Suspense>
    </CoachPageLayout>
  );
}
