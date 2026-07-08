'use client';

import { useParams } from 'next/navigation';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { ProgramBuilder } from '@/components/coach/program-builder/program-builder';

export default function EditProgramPage() {
  const params = useParams<{ id: string }>();
  return (
    <CoachPageLayout>
      <ProgramBuilder programId={params.id} />
    </CoachPageLayout>
  );
}
