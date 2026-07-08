'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { useCoachProfile, useUpdateCoachProfile } from '@/lib/query/use-coach-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
  cardNumber: z.string().max(34).optional(),
  cardHolder: z.string().max(120).optional(),
  programPrice: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(0).max(1_000_000_000).optional(),
  ),
});
type FormValues = z.infer<typeof schema>;

export function IntakeSettings() {
  const t = useTranslations('intake');
  const { data: profile, isLoading } = useCoachProfile();
  const update = useUpdateCoachProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: profile
      ? {
          cardNumber: profile.cardNumber ?? '',
          cardHolder: profile.cardHolder ?? '',
          programPrice: (profile.programPrice ?? '') as unknown as number,
        }
      : undefined,
  });
  const { register, handleSubmit } = form;

  function onSubmit(values: FormValues) {
    update.mutate(
      {
        cardNumber: values.cardNumber?.trim() ? values.cardNumber : null,
        cardHolder: values.cardHolder?.trim() ? values.cardHolder : null,
        programPrice: values.programPrice ? Number(values.programPrice) : null,
      },
      { onSuccess: () => toast.success(t('saved')), onError: () => toast.error(t('saveError')) },
    );
  }

  const fields = [
    'fullName',
    'age',
    'weight',
    'height',
    'trainingHistory',
    'medical',
    'daysPerWeek',
    'photos',
    'receipt',
  ] as const;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="space-y-4 p-4">
                <div>
                  <Label className="text-base">{t('paymentTitle')}</Label>
                  <p className="text-sm text-muted-foreground">{t('paymentHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">{t('cardNumber')}</Label>
                  <Input id="cardNumber" dir="ltr" inputMode="numeric" placeholder="6037-XXXX-XXXX-XXXX" {...register('cardNumber')} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cardHolder">{t('cardHolder')}</Label>
                    <Input id="cardHolder" {...register('cardHolder')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="programPrice">{t('programPrice')}</Label>
                    <Input id="programPrice" type="number" inputMode="numeric" dir="ltr" {...register('programPrice')} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {update.isPending ? t('saving') : t('save')}
            </Button>
          </form>

          {/* Preview of what students fill in */}
          <Card>
            <CardContent className="space-y-2 p-4">
              <Label className="text-base">{t('formPreview')}</Label>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {fields.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary/60" />
                    {t(`field_${f}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
