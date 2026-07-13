'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { CreditCard, Dumbbell, Inbox, PencilLine, User } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { GettingStarted } from '@/components/coach/getting-started';
import { useMe } from '@/lib/query/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CoachPage() {
  return (
    <CoachPageLayout>
      <CoachDashboard />
    </CoachPageLayout>
  );
}

const quickActions = [
  { href: '/coach/programs/new', key: 'writeProgram', icon: PencilLine },
  { href: '/coach/exercises', key: 'addExercise', icon: Dumbbell },
  { href: '/coach/requests', key: 'requests', icon: Inbox },
  { href: '/coach/profile#public-page', key: 'publicLink', icon: User },
] as const;

function CoachDashboard() {
  const t = useTranslations('dashboard');
  const th = useTranslations('coachHome');
  const format = useFormatter();
  const { data } = useMe();
  if (!data) return null;

  const identifier = data.phone ?? data.email;
  const sub = data.subscription;
  const subLabel =
    sub?.status === 'TRIALING' ? t('trial') : sub?.status === 'ACTIVE' ? t('active') : sub ? t('expired') : th('noSub');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('coachTitle')}</h1>
        <p className="text-muted-foreground">
          {t('signedInAs')}: <span dir="ltr">{identifier}</span>
        </p>
      </div>

      <GettingStarted />

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{th('quickActions')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map(({ href, key, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              {th(`action_${key}`)}
            </Link>
          ))}
        </div>
      </div>

      {/* Subscription status */}
      <Card className="max-w-md">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">{subLabel}</CardTitle>
            {sub && (
              <CardDescription>
                {t('trialEndsOn', { date: format.dateTime(new Date(sub.endsAt), { dateStyle: 'medium' }) })}
              </CardDescription>
            )}
          </div>
          <Link href="/coach/billing" className="text-muted-foreground hover:text-foreground">
            <CreditCard className="size-5" />
          </Link>
        </CardHeader>
      </Card>
    </div>
  );
}
