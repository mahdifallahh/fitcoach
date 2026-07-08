'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Calendar, Inbox, Pencil, Ruler, Weight, X } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useCoachRequests, useSetRequestStatus } from '@/lib/query/use-requests';
import type { CoachRequest } from '@/lib/api/types';
import { GifLightbox } from '@/components/shared/gif-lightbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export function RequestsInbox() {
  const t = useTranslations('requests');
  const { data, isLoading } = useCoachRequests();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <Inbox className="mb-2 size-8" />
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req }: { req: CoachRequest }) {
  const t = useTranslations('requests');
  const format = useFormatter();
  const router = useRouter();
  const setStatus = useSetRequestStatus();
  const [declining, setDeclining] = React.useState(false);
  const [reason, setReason] = React.useState('');

  // Navigate to the builder; the request flips to ACCEPTED only when the program is saved.
  function writeProgram() {
    router.push(`/coach/programs/new?student=${encodeURIComponent(req.contact)}&request=${req.id}`);
  }

  function confirmDecline() {
    if (!reason.trim()) return;
    setStatus.mutate(
      { id: req.id, status: 'DECLINED', declineReason: reason.trim() },
      {
        onSuccess: () => setDeclining(false),
        onError: () => toast.error(t('actionError')),
      },
    );
  }

  const photos: { url: string | null; label: string }[] = [
    { url: req.photoFrontUrl, label: t('photoFront') },
    { url: req.photoSideUrl, label: t('photoSide') },
    { url: req.photoBackUrl, label: t('photoBack') },
    { url: req.receiptUrl, label: t('receipt') },
  ];
  const hasPhotos = photos.some((p) => p.url);
  const training =
    req.trainingYears != null || req.trainingMonths != null
      ? t('trainingValue', { years: req.trainingYears ?? 0, months: req.trainingMonths ?? 0 })
      : null;
  const statusVariant = req.status === 'ACCEPTED' ? 'default' : req.status === 'DECLINED' ? 'secondary' : 'default';

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold leading-tight">{req.fullName}</h3>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {req.contact} · {format.dateTime(new Date(req.createdAt), { dateStyle: 'medium' })}
            </p>
          </div>
          <Badge variant={statusVariant}>{t(`status${req.status}`)}</Badge>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2 text-sm">
          {req.age != null && <Chip>{t('ageValue', { age: req.age })}</Chip>}
          {req.weightKg != null && (
            <Chip>
              <Weight className="size-3.5" /> {req.weightKg} kg
            </Chip>
          )}
          {req.heightCm != null && (
            <Chip>
              <Ruler className="size-3.5" /> {req.heightCm} cm
            </Chip>
          )}
          {req.daysPerWeek != null && (
            <Chip>
              <Calendar className="size-3.5" /> {t('daysValue', { days: req.daysPerWeek })}
            </Chip>
          )}
          {training && <Chip>{training}</Chip>}
        </div>

        {req.medicalHistory && <Field label={t('medical')} value={req.medicalHistory} />}

        {hasPhotos && (
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) =>
              p.url ? (
                <div key={i} className="space-y-1">
                  <GifLightbox src={p.url} alt={p.label} className="size-20 overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="size-full object-cover" />
                  </GifLightbox>
                  <p className="text-center text-[10px] text-muted-foreground">{p.label}</p>
                </div>
              ) : null,
            )}
          </div>
        )}

        {req.status === 'DECLINED' && req.declineReason && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t('declineReasonLabel')}: {req.declineReason}
          </p>
        )}

        {/* Actions */}
        {declining ? (
          <div className="space-y-2 rounded-lg border p-3">
            <Label>{t('declineReasonLabel')}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('declineReasonPlaceholder')} />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={setStatus.isPending || !reason.trim()} onClick={confirmDecline}>
                {t('confirmDecline')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={writeProgram}>
              <Pencil className="size-4" /> {t('writeProgram')}
            </Button>
            {req.status !== 'DECLINED' && (
              <Button size="sm" variant="ghost" onClick={() => setDeclining(true)}>
                <X className="size-4" /> {t('decline')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">{children}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}

// Local Label (avoid extra import churn)
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}
