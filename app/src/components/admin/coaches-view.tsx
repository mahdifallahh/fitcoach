'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, ExternalLink, Loader2, Search, Users } from 'lucide-react';
import { useAdminCoaches, useAdminSetTier } from '@/lib/query/use-admin';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { apiErrorMessage } from '@/lib/api/client';
import type { AdminCoach } from '@/lib/api/types';
import { TIER_MAX_STUDENTS, type TierCode } from '@/lib/plans';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

/** All tiers in upgrade order — the values admin can assign. */
const TIER_CODES = Object.keys(TIER_MAX_STUDENTS) as TierCode[];

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
  const setTier = useAdminSetTier();

  // Students used vs. cap; cap null = unlimited (∞).
  const capLabel = coach.cap === null ? t('unlimited') : format.number(coach.cap);
  const usageLabel = t('studentsOfCap', {
    count: format.number(coach.counts.students),
    cap: capLabel,
  });

  function onChangeTier(next: TierCode) {
    if (next === coach.tier) return;
    setTier.mutate(
      { coachUserId: coach.userId, tier: next },
      {
        onSuccess: () => toast.success(t('tierChanged', { tier: t(`tier_${next}`) })),
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
          <Badge variant={coach.atQuota ? 'secondary' : 'default'}>{t(`tier_${coach.tier}`)}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            className={
              'inline-flex items-center gap-1 rounded-md px-2 py-1 ' +
              (coach.atQuota ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted')
            }
          >
            {coach.atQuota ? <AlertTriangle className="size-3.5" /> : <Users className="size-3.5" />}
            {usageLabel}
          </span>
          <span className="rounded-md bg-muted px-2 py-1">{t('countPrograms', { count: coach.counts.programs })}</span>
          <span className="rounded-md bg-muted px-2 py-1">{t('countExercises', { count: coach.counts.exercises })}</span>
        </div>

        {/* Owner action: set the coach's capability tier */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <label className="text-sm text-muted-foreground" htmlFor={`tier-${coach.userId}`}>
            {t('tierLabel')}
          </label>
          <Select
            id={`tier-${coach.userId}`}
            className="h-9 w-40"
            value={coach.tier}
            disabled={setTier.isPending}
            onChange={(e) => onChangeTier(e.target.value as TierCode)}
          >
            {TIER_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`tier_${code}`)}
                {TIER_MAX_STUDENTS[code] === null ? '' : ` (${TIER_MAX_STUDENTS[code]})`}
              </option>
            ))}
          </Select>
          {setTier.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}
