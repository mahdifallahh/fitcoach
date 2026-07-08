'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { CoachPageLayout } from '@/components/coach/coach-page-layout';
import { useMe } from '@/lib/query/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CoachPage() {
  return (
    <CoachPageLayout>
      <CoachDashboard />
    </CoachPageLayout>
  );
}

function CoachDashboard() {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const { data } = useMe();
  if (!data) return null;

  const identifier = data.phone ?? data.email;
  const sub = data.subscription;
  const subLabel =
    sub?.status === 'TRIALING' ? t('trial') : sub?.status === 'ACTIVE' ? t('active') : t('expired');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('coachTitle')}</h1>
        <p className="text-muted-foreground">
          {t('signedInAs')}: <span dir="ltr">{identifier}</span>
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">{subLabel}</CardTitle>
          {sub && (
            <CardDescription>
              {t('trialEndsOn', {
                date: format.dateTime(new Date(sub.endsAt), { dateStyle: 'medium' }),
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
