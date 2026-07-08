'use client';

import { StudentPageLayout } from '@/components/student/student-page-layout';
import { MyRequests } from '@/components/student/my-requests';

export default function StudentRequestsPage() {
  return (
    <StudentPageLayout>
      <MyRequests />
    </StudentPageLayout>
  );
}
