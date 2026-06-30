'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronLeft, ImagePlus, Loader2, Send, X } from 'lucide-react';
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

const schema = z.object({
  fullName: z.string().min(1).max(120),
  weightKg: z.coerce.number().min(20).max(400).optional().or(z.literal('').transform(() => undefined)),
  heightCm: z.coerce.number().min(80).max(260).optional().or(z.literal('').transform(() => undefined)),
  practiceHistory: z.string().max(2000).optional(),
  injuries: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

interface Photo {
  key: string;
  preview: string;
}

function RequestForm() {
  const t = useTranslations('request');
  const params = useParams();
  const handle = String(params.handle);
  const router = useRouter();
  const { data: me } = useMe();
  const { data: coach } = usePublicCoach(handle);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const room = 6 - photos.length;
    setUploading(true);
    try {
      for (const file of files.slice(0, room)) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
          toast.error(t('uploadError'));
          continue;
        }
        const { uploadUrl, key } = await requestsApi.imageUploadUrl(file.type);
        const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!res.ok) {
          toast.error(t('uploadError'));
          continue;
        }
        setPhotos((p) => [...p, { key, preview: URL.createObjectURL(file) }]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await requestsApi.create({
        handle,
        fullName: values.fullName,
        weightKg: values.weightKg as number | undefined,
        heightCm: values.heightCm as number | undefined,
        practiceHistory: values.practiceHistory || undefined,
        injuries: values.injuries || undefined,
        description: values.description || undefined,
        imageKeys: photos.map((p) => p.key),
      });
      toast.success(t('success'));
      router.replace('/student');
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

      <h1 className="text-2xl font-bold">{t('title')}</h1>
      {coach && <p className="mt-1 text-muted-foreground">{t('from', { name: coach.name })}</p>}

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

        <div className="grid grid-cols-2 gap-3">
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
          <Label htmlFor="practiceHistory">{t('history')}</Label>
          <Textarea id="practiceHistory" placeholder={t('historyPlaceholder')} {...register('practiceHistory')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="injuries">{t('injuries')}</Label>
          <Textarea id="injuries" {...register('injuries')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('description')}</Label>
          <Textarea id="description" {...register('description')} />
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <Label>{t('photos')}</Label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p.key} className="relative size-20 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                  className="absolute end-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="remove"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-muted"
              >
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                <span className="text-[10px]">{t('addPhotos')}</span>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('maxPhotos')}</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={onPickPhotos}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting || uploading}>
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
