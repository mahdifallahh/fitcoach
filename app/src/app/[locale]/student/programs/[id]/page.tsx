'use client';

import { useParams } from 'next/navigation';
import { StudentPageLayout } from '@/components/student/student-page-layout';
import { ProgramViewer } from '@/components/student/program-viewer';

export default function StudentProgramPage() {
  const params = useParams<{ id: string }>();
  return (
    <StudentPageLayout>
      <ProgramViewer programId={params.id} />
    </StudentPageLayout>
  );
}
