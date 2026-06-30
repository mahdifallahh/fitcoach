'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Inbox, Ruler, Send, Weight, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCoachRequests, useSetRequestStatus } from '@/lib/query/use-requests';
import type { CoachRequest } from '@/lib/api/types';
import { GifLightbox } from '@/components/shared/gif-lightbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function RequestsInbox() {
  const t = useTranslations('requests');
  const { data, isLoading } = useCoachRequests();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
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
  const setStatus = useSetRequestStatus();

  function update(status: 'REVIEWED' | 'DECLINED') {
    setStatus.mutate({ id: req.id, status }, { onError: () => toast.error(t('actionError')) });
  }

  const statusVariant =
    req.status === 'REVIEWED' ? 'default' : req.status === 'DECLINED' ? 'secondary' : 'default';

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

        {/* Stats */}
        <div className="flex flex-wrap gap-2 text-sm">
          {req.weightKg != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
              <Weight className="size-3.5" /> {req.weightKg} kg
            </span>
          )}
          {req.heightCm != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
              <Ruler className="size-3.5" /> {req.heightCm} cm
            </span>
          )}
        </div>

        {req.practiceHistory && <Field label={t('history')} value={req.practiceHistory} />}
        {req.injuries && <Field label={t('injuries')} value={req.injuries} />}
        {req.description && <Field label={t('notes')} value={req.description} />}

        {req.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {req.imageUrls.map((url, i) => (
              <GifLightbox key={i} src={url} alt={t('photos')} className="size-20 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-cover" />
              </GifLightbox>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <Link href={`/coach/programs/new?student=${encodeURIComponent(req.contact)}`}>
              <Send className="size-4 rtl-flip" /> {t('startProgram')}
            </Link>
          </Button>
          {req.status !== 'REVIEWED' && (
            <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => update('REVIEWED')}>
              <Check className="size-4" /> {t('markReviewed')}
            </Button>
          )}
          {req.status !== 'DECLINED' && (
            <Button size="sm" variant="ghost" disabled={setStatus.isPending} onClick={() => update('DECLINED')}>
              <X className="size-4" /> {t('decline')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}
