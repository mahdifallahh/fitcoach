'use client';

import { StudentPageLayout } from '@/components/student/student-page-layout';
import { StudentHelp } from '@/components/student/student-help';
import { CoachesList } from '@/components/student/coaches-list';

export default function StudentPage() {
  return (
    <StudentPageLayout>
      <StudentHelp />
      <CoachesList />
    </StudentPageLayout>
  );
}
