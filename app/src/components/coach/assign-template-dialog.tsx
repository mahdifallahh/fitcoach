'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Send, Save } from 'lucide-react';
import type { ProgramStatus2, ProgramTemplateListItem } from '@/lib/api/types';
import { apiErrorMessage } from '@/lib/api/client';
import { useAssignTemplate } from '@/lib/query/use-program-templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldErrorText } from '@/components/shared/field-error';

const schema = z.object({
  studentContact: z.string().min(3),
  name: z.string().max(120).optional(),
  age: z.coerce.number().int().min(1).max(120).optional().or(z.literal('')),
  heightCm: z.coerce.number().min(50).max(300).optional().or(z.literal('')),
  weightKg: z.coerce.number().min(10).max(400).optional().or(z.literal('')),
});
type FormValues = z.input<typeof schema>;

export function AssignTemplateDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProgramTemplateListItem | null;
}) {
  const t = useTranslations('templates');
  const tf = useTranslations('forms');
  const assign = useAssignTemplate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Reset the form whenever the dialog opens for a (possibly different) template.
  React.useEffect(() => {
    if (open) reset({ studentContact: '', name: '', age: '', heightCm: '', weightKg: '' });
  }, [open, reset]);

  const num = (v: unknown) => {
    const n = Number(v);
    return v !== '' && v != null && !Number.isNaN(n) ? n : undefined;
  };

  const submit = (status: ProgramStatus2) =>
    handleSubmit((values) => {
      if (!template) return;
      assign.mutate(
        {
          id: template.id,
          payload: {
            studentContact: values.studentContact.trim(),
            name: values.name?.trim() || undefined,
            age: num(values.age),
            heightCm: num(values.heightCm),
            weightKg: num(values.weightKg),
            status,
          },
        },
        {
          onSuccess: () => {
            toast.success(t('assigned', { contact: values.studentContact.trim() }));
            // Keep the dialog open + clear the student so the coach can assign to
            // the next person without reopening.
            reset({ studentContact: '', name: '', age: '', heightCm: '', weightKg: '' });
          },
          onError: (err) => toast.error(apiErrorMessage(err, t('assignError'))),
        },
      );
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('assignTitle')}</DialogTitle>
          <DialogDescription>
            {template ? t('assignSubtitle', { name: template.name }) : ''}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit('DRAFT')}>
          <div className="space-y-2">
            <Label htmlFor="a-contact">{t('studentContact')}</Label>
            <Input id="a-contact" dir="ltr" placeholder="09xxxxxxxxx" {...register('studentContact')} />
            <FieldErrorText error={errors.studentContact} t={tf} />
            <p className="text-xs text-muted-foreground">{t('studentContactHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-name">{t('programNameOptional')}</Label>
            <Input id="a-name" placeholder={template?.name ?? ''} {...register('name')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a-age">{t('age')}</Label>
              <Input id="a-age" type="number" {...register('age')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-height">{t('height')}</Label>
              <Input id="a-height" type="number" {...register('heightCm')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-weight">{t('weight')}</Label>
              <Input id="a-weight" type="number" {...register('weightKg')} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="submit" variant="outline" disabled={assign.isPending}>
              {assign.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t('assignAsDraft')}
            </Button>
            <Button type="button" disabled={assign.isPending} onClick={submit('PUBLISHED')}>
              <Send className="size-4" />
              {t('assignAndPublish')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
