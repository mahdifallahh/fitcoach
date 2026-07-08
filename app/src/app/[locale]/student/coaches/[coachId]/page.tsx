'use client';

import { useParams } from 'next/navigation';
import { StudentPageLayout } from '@/components/student/student-page-layout';
import { CoachPrograms } from '@/components/student/coach-programs';

export default function StudentCoachPage() {
  const params = useParams<{ coachId: string }>();
  return (
    <StudentPageLayout>
      <CoachPrograms coachId={params.coachId} />
    </StudentPageLayout>
  );
}
