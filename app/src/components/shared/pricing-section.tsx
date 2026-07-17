import { getTranslations } from 'next-intl/server';
import { Check, Gift, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { TIERS } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Public pricing on the landing page. Tiers are scoped by student count; prices
 * are "coming soon" for now, so the only live call-to-action is the 15-day free
 * trial (activated inside the coach billing panel after sign-up).
 */
export async function PricingSection() {
  const t = await getTranslations('landing.pricing');

  return (
    <section className="border-t py-16">
      <div className="container flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="max-w-lg text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Free trial — the one actionable offer right now */}
      <div className="container mt-8 flex justify-center">
        <div className="flex w-full max-w-3xl flex-col items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center sm:flex-row sm:text-start">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Gift className="size-6" />
            </span>
            <div>
              <p className="font-bold">{t('trialTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('trialDesc')}</p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/login?role=coach">
              <Check className="size-4" />
              {t('trialCta')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Paid tiers — scoped by number of students, pricing coming soon */}
      <div className="container mt-6 grid max-w-3xl gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.code}
            className={cn('relative flex flex-col', tier.highlight && 'border-primary shadow-sm')}
          >
            {tier.highlight && (
              <Badge className="absolute -top-2.5 start-4">
                <Sparkles className="me-1 size-3" />
                {t('popular')}
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{t(`tier_${tier.code}_name`)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {tier.maxStudents === null
                  ? t('unlimitedStudents')
                  : t('upToStudents', { count: tier.maxStudents })}
              </p>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <p className="text-xl font-bold text-primary">{t('comingSoon')}</p>
              <Button variant="outline" className="w-full" disabled>
                {t('comingSoonCta')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">{t('trialNote')}</p>
    </section>
  );
}
