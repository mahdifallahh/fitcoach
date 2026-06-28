'use client';

import * as React from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { useBilling, useCheckout, useDevComplete } from '@/lib/query/use-billing';
import type { BillingPlan, PaymentGateway, SubscriptionPlan } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function BillingView() {
  const t = useTranslations('billing');
  const format = useFormatter();
  const locale = useLocale() as 'fa' | 'en';
  const params = useSearchParams();
  const { data, isLoading } = useBilling();
  const checkout = useCheckout();
  const devComplete = useDevComplete();
  const [gateway, setGateway] = React.useState<PaymentGateway>(locale === 'en' ? 'STRIPE' : 'ZARINPAL');
  const handled = React.useRef(false);

  // Handle the return from checkout: dev-simulate completion, or a gateway status.
  React.useEffect(() => {
    if (handled.current) return;
    const simulate = params.get('simulate');
    const status = params.get('status');
    if (!simulate && !status) return;
    handled.current = true;
    if (simulate) {
      devComplete.mutate(simulate, {
        onSuccess: () => toast.success(t('paySuccess')),
        onError: () => toast.error(t('payFailed')),
      });
    } else if (status === 'success') toast.success(t('paySuccess'));
    else if (status === 'cancel') toast.message(t('payCanceled'));
    else toast.error(t('payFailed'));
    if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname);
  }, [params, devComplete, t]);

  function subscribe(plan: SubscriptionPlan) {
    checkout.mutate(
      { plan, gateway, locale },
      {
        onSuccess: (res) => {
          window.location.href = res.redirectUrl;
        },
        onError: () => toast.error(t('payFailed')),
      },
    );
  }

  function price(plan: BillingPlan): string {
    return gateway === 'ZARINPAL'
      ? `${format.number(plan.priceIrr)} ${t('toman')}`
      : `$${plan.priceUsd}`;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full max-w-md" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const sub = data.subscription;
  const statusLabel =
    sub?.status === 'TRIALING' ? t('trial') : sub?.status === 'ACTIVE' ? t('active') : sub ? t('expired') : t('noSub');
  const statusVariant = sub?.status === 'ACTIVE' || sub?.status === 'TRIALING' ? 'default' : 'secondary';
  const dateLine = sub
    ? sub.status === 'TRIALING'
      ? t('trialEnds', { date: fmtDate(sub.endsAt) })
      : sub.status === 'ACTIVE'
        ? t('activeUntil', { date: fmtDate(sub.endsAt) })
        : t('expiredOn', { date: fmtDate(sub.endsAt) })
    : '';

  function fmtDate(d: string) {
    return format.dateTime(new Date(d), { dateStyle: 'medium' });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Current status */}
      <Card className="max-w-md">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-lg">{statusLabel}</CardTitle>
          <Badge variant={statusVariant}>
            <CreditCard className="me-1 size-3.5" />
            {sub?.plan ?? '—'}
          </Badge>
        </CardHeader>
        {dateLine && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{dateLine}</p>
          </CardContent>
        )}
      </Card>

      {data.simulateMode && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300">
          {t('simulateNote')}
        </p>
      )}

      {/* Gateway toggle */}
      <div>
        <p className="mb-2 text-sm font-medium">{t('payVia')}</p>
        <div className="inline-flex rounded-lg border p-1">
          {(['ZARINPAL', 'STRIPE'] as PaymentGateway[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGateway(g)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                gateway === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {g === 'ZARINPAL' ? t('zarinpal') : t('stripe')}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="grid gap-3 sm:grid-cols-3">
        {data.plans.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{t('monthsCount', { count: plan.months })}</CardTitle>
              <p className="text-2xl font-bold text-primary" dir="ltr">
                {price(plan)}
              </p>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" disabled={checkout.isPending} onClick={() => subscribe(plan.id)}>
                {checkout.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {checkout.isPending ? t('subscribing') : t('subscribe')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('history')}</h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
        ) : (
          <div className="divide-y rounded-xl border">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium">{p.plan}</span>
                <span className="text-muted-foreground" dir="ltr">
                  {p.gateway} · {format.number(p.amount)} {p.currency}
                </span>
                <Badge variant={p.status === 'PAID' ? 'default' : 'secondary'}>
                  {p.status === 'PAID' ? t('statusPaid') : p.status === 'PENDING' ? t('statusPending') : t('statusFailed')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
