'use client';

import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { TemplateBuilder } from '@/components/coach/template-builder/template-builder';

export default function NewTemplatePage() {
  return (
    <CoachPageLayout>
      <TemplateBuilder />
    </CoachPageLayout>
  );
}
