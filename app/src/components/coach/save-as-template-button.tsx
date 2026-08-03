'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { apiErrorMessage } from '@/lib/api/client';
import { useCreateTemplateFromProgram } from '@/lib/query/use-program-templates';
import { Button } from '@/components/ui/button';

/**
 * "Add to my templates" — copies the open program into the coach's template
 * library, where it can be assigned to any number of students.
 *
 * The copy is made on the server from the *saved* program, not from the builder's
 * draft state: templating something that only exists in an unsaved form would
 * silently capture a different plan than the one on screen.
 */
export function SaveAsTemplateButton({ programId }: { programId: string }) {
  const t = useTranslations('programs');
  const router = useRouter();
  const create = useCreateTemplateFromProgram();

  function saveAsTemplate() {
    create.mutate(
      { programId },
      {
        onSuccess: (template) => {
          // Offer the next step rather than navigating away from unsaved edits.
          toast.success(t('savedAsTemplate'), {
            action: {
              label: t('openTemplate'),
              onClick: () => router.push(`/coach/templates/${template.id}/edit`),
            },
          });
        },
        onError: (err) => toast.error(apiErrorMessage(err, t('saveTemplateError'))),
      },
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={saveAsTemplate}
      disabled={create.isPending}
    >
      {create.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LayoutTemplate className="size-4" />
      )}
      {t('saveAsTemplate')}
    </Button>
  );
}
