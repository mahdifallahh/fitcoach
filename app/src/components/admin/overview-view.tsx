'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  ClipboardList,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Inbox,
  Users,
} from 'lucide-react';
import { useAdminOverview } from '@/lib/query/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export function OverviewView() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const format = useFormatter();
  const { data, isLoading, isError, refetch } = useAdminOverview();

  if (isError) {
    return <ErrorState message={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const tiles = [
    { icon: Users, label: t('coaches'), value: data.totals.coaches },
    { icon: GraduationCap, label: t('students'), value: data.totals.students },
    { icon: ClipboardList, label: t('programs'), value: data.totals.programs, sub: t('publishedCount', { count: data.totals.publishedPrograms }) },
    { icon: Inbox, label: t('requests'), value: data.totals.requests, sub: t('pendingCount', { count: data.totals.pendingRequests }) },
    { icon: Dumbbell, label: t('exercises'), value: data.totals.exercises },
  ];
  const subStatuses = ['TRIALING', 'ACTIVE', 'EXPIRED', 'CANCELED'] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('overviewTitle')}</h1>
        <p className="text-muted-foreground">{t('overviewSubtitle')}</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(({ icon: Icon, label, value, sub }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4" /> {label}
              </div>
              <p className="mt-1 text-2xl font-bold">{format.number(value)}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscriptions + revenue */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <CreditCard className="size-4" /> {t('subscriptions')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {subStatuses.map((s) => (
                <Badge key={s} variant={s === 'ACTIVE' || s === 'TRIALING' ? 'default' : 'secondary'}>
                  {t(`sub_${s}`)}: {format.number(data.subscriptions[s] ?? 0)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 font-semibold">{t('revenue')}</h2>
            {data.revenue.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noRevenue')}</p>
            ) : (
              <ul className="space-y-1.5">
                {data.revenue.map((r) => (
                  <li key={r.currency} className="flex items-center justify-between text-sm">
                    <span dir="ltr" className="font-medium">
                      {format.number(r.total)} {r.currency}
                    </span>
                    <span className="text-muted-foreground">{t('paymentsCount', { count: r.payments })}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent signups */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 font-semibold">{t('recentUsers')}</h2>
          <div className="divide-y">
            {data.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span dir="ltr" className="truncate">{u.phone ?? u.email}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary">{t(`role_${u.role}`)}</Badge>
                  {format.dateTime(new Date(u.createdAt), { dateStyle: 'medium' })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
