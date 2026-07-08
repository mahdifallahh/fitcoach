'use client';

import { StudentPageLayout } from '@/components/student/student-page-layout';
import { CoachesList } from '@/components/student/coaches-list';

export default function StudentPage() {
  return (
    <StudentPageLayout>
      <CoachesList />
    </StudentPageLayout>
  );
}
