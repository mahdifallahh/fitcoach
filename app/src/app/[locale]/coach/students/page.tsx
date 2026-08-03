'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { StudentList } from '@/components/coach/student-list';

export default function CoachStudentsPage() {
  return (
    <CoachPageLayout>
      <StudentList />
    </CoachPageLayout>
  );
}
