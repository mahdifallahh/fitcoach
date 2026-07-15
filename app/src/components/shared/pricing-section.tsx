import { getFormatter, getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { PUBLIC_PLANS, type PlanCode } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PLAN_ORDER: PlanCode[] = ['M3', 'M6', 'M12'];

/** Public pricing cards on the landing page — informational; actual checkout happens in the coach billing panel. */
export async function PricingSection() {
  const t = await getTranslations('landing.pricing');
  const tb = await getTranslations('billing');
  const format = await getFormatter();

  return (
    <section className="border-t py-16">
      <div className="container flex flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="max-w-lg text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="container mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((code) => {
          const plan = PUBLIC_PLANS[code];
          return (
            <Card key={code} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{tb('monthsCount', { count: plan.months })}</CardTitle>
                <p className="text-2xl font-bold text-primary" dir="ltr">
                  {format.number(plan.priceIrr)} {tb('toman')}
                </p>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild className="w-full">
                  <Link href="/login?role=coach">
                    <Check className="size-4" />
                    {t('cta')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">{t('trialNote')}</p>
    </section>
  );
}
