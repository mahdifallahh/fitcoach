'use client';

import { StudentPageLayout } from '@/components/student/student-page-layout';
import { StudentHelp } from '@/components/student/student-help';
import { CoachesList } from '@/components/student/coaches-list';
import { DeleteAccountCard } from '@/components/shared/delete-account-card';

export default function StudentPage() {
  return (
    <StudentPageLayout>
      <StudentHelp />
      <CoachesList />
      {/* Students have no separate settings page, so account actions live here. */}
      <div className="pt-8">
        <DeleteAccountCard />
      </div>
    </StudentPageLayout>
  );
}
