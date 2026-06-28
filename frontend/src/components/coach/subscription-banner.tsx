'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { useMe } from '@/lib/query/use-auth';
import { Button } from '@/components/ui/button';

/** Shown to coaches whose trial/plan has lapsed (write access is blocked server-side). */
export function SubscriptionBanner() {
  const t = useTranslations('billing');
  const pathname = usePathname();
  const { data } = useMe();

  if (!data || data.role !== 'COACH' || pathname === '/coach/billing') return null;
  const sub = data.subscription;
  const expired =
    !sub || sub.status === 'EXPIRED' || sub.status === 'CANCELED' || new Date(sub.endsAt).getTime() < Date.now();
  if (!expired) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="flex items-center gap-2 text-sm">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        {t('bannerExpired')}
      </p>
      <Button asChild size="sm">
        <Link href="/coach/billing">{t('bannerCta')}</Link>
      </Button>
    </div>
  );
}
