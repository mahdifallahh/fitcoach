'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  ClipboardList,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Inbox,
  Layers,
  TrendingUp,
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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

  // Growth (trailing 7 / 30 days), the "is the platform moving?" read.
  const growth = [
    { label: t('coaches'), d7: data.growth.newCoaches7, d30: data.growth.newCoaches30 },
    { label: t('students'), d7: data.growth.newStudents7, d30: data.growth.newStudents30 },
  ];

  const totalTierCoaches = data.tiers.reduce((s, x) => s + x.count, 0) || 1;

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

      {/* Growth + tier distribution */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="size-4" /> {t('growthTitle')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {growth.map((g) => (
                <div key={g.label} className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">{g.label}</p>
                  <p className="mt-1 text-xl font-bold text-primary">+{format.number(g.d7)}</p>
                  <p className="text-xs text-muted-foreground">{t('last7')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('last30')}: <span className="font-medium text-foreground">+{format.number(g.d30)}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Layers className="size-4" /> {t('tierDistribution')}
            </h2>
            <ul className="space-y-2">
              {data.tiers.map(({ tier, count }) => {
                const pct = Math.round((count / totalTierCoaches) * 100);
                return (
                  <li key={tier}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{t(`tier_${tier}`)}</span>
                      <span className="text-muted-foreground">
                        {format.number(count)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Revenue */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <CreditCard className="size-4" /> {t('revenue')}
          </h2>
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
