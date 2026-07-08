'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { useMyRequests } from '@/lib/query/use-requests';
import type { StudentRequest } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function MyRequests() {
  const t = useTranslations('myRequests');
  const format = useFormatter();
  const { data, isLoading } = useMyRequests();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-7 w-40" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
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
            <RequestRow key={req.id} req={req} formatted={format.dateTime(new Date(req.createdAt), { dateStyle: 'medium' })} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ req, formatted }: { req: StudentRequest; formatted: string }) {
  const t = useTranslations('myRequests');
  const variant = req.status === 'ACCEPTED' ? 'default' : 'secondary';

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold">{req.coach.name}</p>
            <p className="text-sm text-muted-foreground">{formatted}</p>
          </div>
          <Badge variant={variant}>{t(`status${req.status}`)}</Badge>
        </div>
        {req.status === 'ACCEPTED' && <p className="text-sm text-primary">{t('acceptedNote')}</p>}
        {req.status === 'DECLINED' && req.declineReason && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t('declineReasonLabel')}: {req.declineReason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
