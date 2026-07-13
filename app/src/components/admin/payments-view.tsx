'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useAdminPayments } from '@/lib/query/use-admin';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export function PaymentsView() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const format = useFormatter();
  const { data, isLoading, isError, refetch } = useAdminPayments();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('paymentsTitle')}</h1>
        <p className="text-muted-foreground">{t('paymentsSubtitle')}</p>
      </div>

      {isError ? (
        <ErrorState message={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          {t('noPayments')}
        </p>
      ) : (
        <div className="divide-y rounded-xl border">
          {data.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.coach.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format.dateTime(new Date(p.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <span className="text-muted-foreground" dir="ltr">
                {p.gateway} · {p.plan ?? '—'} · {format.number(p.amount)} {p.currency}
              </span>
              <Badge variant={p.status === 'PAID' ? 'default' : 'secondary'}>
                {t(`pay_${p.status}`)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
