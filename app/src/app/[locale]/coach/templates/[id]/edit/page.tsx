'use client';

import { useParams } from 'next/navigation';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { TemplateBuilder } from '@/components/coach/template-builder/template-builder';

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  return (
    <CoachPageLayout>
      <TemplateBuilder templateId={params.id} />
    </CoachPageLayout>
  );
}
