'use client';

import { useParams } from 'next/navigation';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { StudentDetail } from '@/components/coach/student-detail';

export default function CoachStudentPage() {
  const params = useParams<{ id: string }>();
  return (
    <CoachPageLayout>
      <StudentDetail studentId={params.id} />
    </CoachPageLayout>
  );
}
