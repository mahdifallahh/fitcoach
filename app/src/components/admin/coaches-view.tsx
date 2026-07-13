'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarPlus, ExternalLink, Loader2, Search, XCircle } from 'lucide-react';
import { useAdminCoaches, useAdminSubscriptionAction } from '@/lib/query/use-admin';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { apiErrorMessage } from '@/lib/api/client';
import type { AdminCoach } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export function CoachesView() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [search, setSearch] = React.useState('');
  const ds = useDebounce(search, 300);
  const { data, isLoading, isError, refetch } = useAdminCoaches(ds || undefined);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('coachesTitle')}</h1>
        <p className="text-muted-foreground">{t('coachesSubtitle')}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t('searchCoaches')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isError ? (
        <ErrorState message={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          {t('noCoaches')}
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((coach) => (
            <CoachCard key={coach.userId} coach={coach} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoachCard({ coach }: { coach: AdminCoach }) {
  const t = useTranslations('admin');
  const format = useFormatter();
  const action = useAdminSubscriptionAction();
  const [days, setDays] = React.useState('30');

  const sub = coach.subscription;
  const subLabel = sub
    ? `${t(`sub_${sub.status}`)} · ${format.dateTime(new Date(sub.endsAt), { dateStyle: 'medium' })}`
    : t('noSub');

  function grant() {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1) return toast.error(t('badDays'));
    action.mutate(
      { coachUserId: coach.userId, action: 'grant', days: n },
      {
        onSuccess: () => toast.success(t('granted', { days: n })),
        onError: (e) => toast.error(apiErrorMessage(e, t('actionError'))),
      },
    );
  }

  function expire() {
    if (!confirm(t('expireConfirm', { name: coach.name }))) return;
    action.mutate(
      { coachUserId: coach.userId, action: 'expire' },
      {
        onSuccess: () => toast.success(t('expired')),
        onError: (e) => toast.error(apiErrorMessage(e, t('actionError'))),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold">
              {coach.name}
              {coach.handle && (
                <a
                  href={`/fa/c/${coach.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  aria-label={t('openPublicPage')}
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </p>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {coach.phone ?? coach.email} · {format.dateTime(new Date(coach.joinedAt), { dateStyle: 'medium' })}
            </p>
          </div>
          <Badge variant={sub?.live ? 'default' : 'secondary'}>{subLabel}</Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1">{t('countPrograms', { count: coach.counts.programs })}</span>
          <span className="rounded-md bg-muted px-2 py-1">{t('countStudents', { count: coach.counts.students })}</span>
          <span className="rounded-md bg-muted px-2 py-1">{t('countExercises', { count: coach.counts.exercises })}</span>
        </div>

        {/* Owner actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="h-9 w-24"
            dir="ltr"
            aria-label={t('daysLabel')}
          />
          <Button size="sm" disabled={action.isPending} onClick={grant}>
            {action.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
            {t('grantDays')}
          </Button>
          {sub?.live && (
            <Button size="sm" variant="outline" disabled={action.isPending} onClick={expire}>
              <XCircle className="size-4 text-destructive" />
              {t('expireNow')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
