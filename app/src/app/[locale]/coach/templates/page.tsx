'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { TemplateList } from '@/components/coach/template-list';

export default function CoachTemplatesPage() {
  return (
    <CoachPageLayout>
      <TemplateList />
    </CoachPageLayout>
  );
}
