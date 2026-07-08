'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronLeft, CreditCard, ImagePlus, Loader2, Send, User, X } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useMe } from '@/lib/query/use-auth';
import { requestsApi } from '@/lib/api/requests';
import { usePublicCoach } from '@/lib/query/use-requests';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@/lib/api/upload';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

/** Empty input → undefined (so optional numbers aren't coerced to 0). */
const optNum = (inner: z.ZodTypeAny) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), inner.optional());

const schema = z.object({
  fullName: z.string().min(1).max(120),
  age: optNum(z.coerce.number().int().min(5).max(120)),
  weightKg: optNum(z.coerce.number().min(20).max(400)),
  heightCm: optNum(z.coerce.number().min(80).max(260)),
  trainingYears: optNum(z.coerce.number().int().min(0).max(80)),
  trainingMonths: optNum(z.coerce.number().int().min(0).max(11)),
  medicalHistory: z.string().max(2000).optional(),
  daysPerWeek: optNum(z.coerce.number().int().min(1).max(7)),
});
type FormValues = z.infer<typeof schema>;

type Slot = { key: string; preview: string } | null;

/** A single labeled image slot (upload one, preview, remove). */
function PhotoSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Slot;
  onChange: (v: Slot) => void;
}) {
  const t = useTranslations('request');
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) return toast.error(t('uploadError'));
    setBusy(true);
    try {
      const { uploadUrl, key } = await requestsApi.imageUploadUrl(file.type);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('upload');
      onChange({ key, preview: URL.createObjectURL(file) });
    } catch {
      toast.error(t('uploadError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <input ref={ref} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} className="hidden" onChange={pick} />
      {value ? (
        <div className="relative aspect-square overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.preview} alt={label} className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white"
            aria-label="remove"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-muted"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        </button>
      )}
    </div>
  );
}

function RequestForm() {
  const t = useTranslations('request');
  const format = useFormatter();
  const params = useParams();
  const handle = String(params.handle);
  const router = useRouter();
  const { data: me } = useMe();
  const { data: coach } = usePublicCoach(handle);
  const [front, setFront] = React.useState<Slot>(null);
  const [side, setSide] = React.useState<Slot>(null);
  const [back, setBack] = React.useState<Slot>(null);
  const [receipt, setReceipt] = React.useState<Slot>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await requestsApi.create({
        handle,
        fullName: values.fullName,
        age: values.age as number | undefined,
        weightKg: values.weightKg as number | undefined,
        heightCm: values.heightCm as number | undefined,
        trainingYears: values.trainingYears as number | undefined,
        trainingMonths: values.trainingMonths as number | undefined,
        medicalHistory: values.medicalHistory || undefined,
        daysPerWeek: values.daysPerWeek as number | undefined,
        photoFrontKey: front?.key,
        photoSideKey: side?.key,
        photoBackKey: back?.key,
        receiptKey: receipt?.key,
      });
      toast.success(t('success'));
      router.replace('/student/requests');
    } catch {
      toast.error(t('error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-lg py-8">
      <Link
        href={`/c/${handle}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4 rtl-flip" /> {t('back')}
      </Link>

      {/* Coach identity */}
      {coach && (
        <div className="mb-5 flex items-center gap-3">
          {coach.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.avatarUrl} alt={coach.name} className="size-12 rounded-full object-cover" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-6" />
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">{t('coachCaption')}</p>
            <p className="font-bold">{coach.name}</p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <Input id="fullName" placeholder={t('fullNamePlaceholder')} {...register('fullName')} />
          {formState.errors.fullName && <p className="text-sm text-destructive">{t('fullName')}</p>}
        </div>

        {me?.phone && (
          <div className="space-y-2">
            <Label>{t('phone')}</Label>
            <Input dir="ltr" value={me.phone} disabled />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="age">{t('age')}</Label>
            <Input id="age" type="number" inputMode="numeric" {...register('age')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg">{t('weight')}</Label>
            <Input id="weightKg" type="number" inputMode="decimal" {...register('weightKg')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heightCm">{t('height')}</Label>
            <Input id="heightCm" type="number" inputMode="decimal" {...register('heightCm')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('trainingHistory')}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" inputMode="numeric" placeholder={t('years')} {...register('trainingYears')} />
            <Input type="number" inputMode="numeric" placeholder={t('months')} {...register('trainingMonths')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="daysPerWeek">{t('daysPerWeek')}</Label>
          <Input id="daysPerWeek" type="number" inputMode="numeric" min={1} max={7} {...register('daysPerWeek')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="medical">{t('medical')}</Label>
          <Textarea id="medical" placeholder={t('medicalPlaceholder')} {...register('medicalHistory')} />
        </div>

        {/* Photos: front / side / back */}
        <div className="space-y-2">
          <Label>{t('photos')}</Label>
          <div className="grid grid-cols-3 gap-3">
            <PhotoSlot label={t('photoFront')} value={front} onChange={setFront} />
            <PhotoSlot label={t('photoSide')} value={side} onChange={setSide} />
            <PhotoSlot label={t('photoBack')} value={back} onChange={setBack} />
          </div>
        </div>

        {/* Payment */}
        {(coach?.cardNumber || coach?.programPrice) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 font-medium">
                <CreditCard className="size-4" /> {t('paymentTitle')}
              </div>
              {coach?.programPrice != null && (
                <p className="text-sm">
                  {t('price')}:{' '}
                  <span className="font-bold text-primary">
                    {format.number(coach.programPrice)} {t('toman')}
                  </span>
                </p>
              )}
              {coach?.cardNumber && (
                <div className="text-sm">
                  <p className="text-muted-foreground">{t('payToCard')}</p>
                  <p className="select-all font-mono text-base" dir="ltr">
                    {coach.cardNumber}
                  </p>
                  {coach.cardHolder && <p className="text-muted-foreground">{coach.cardHolder}</p>}
                </div>
              )}
              <div className="max-w-[8rem]">
                <PhotoSlot label={t('receipt')} value={receipt} onChange={setReceipt} />
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl-flip" />}
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  );
}

export default function RequestPage() {
  return (
    <AuthGuard role="STUDENT">
      <RequestForm />
    </AuthGuard>
  );
}
