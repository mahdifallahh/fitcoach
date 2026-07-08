'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ProgramBuilder } from '@/components/coach/program-builder/program-builder';

function NewProgram() {
  const params = useSearchParams();
  const student = params.get('student') ?? undefined;
  const request = params.get('request') ?? undefined;
  return <ProgramBuilder initialContact={student} initialRequestId={request} />;
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
