'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, CreditCard, Dumbbell, PencilLine, User, X, ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCoachProfile } from '@/lib/query/use-coach-profile';
import { useExercises } from '@/lib/query/use-exercises';
import { usePrograms } from '@/lib/query/use-programs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'fitlo:onboarding-dismissed';

/** First-run checklist that guides a new coach through core setup. Auto-hides when
 *  every step is complete, and can be dismissed manually. */
export function GettingStarted() {
  const t = useTranslations('onboarding');
  const { data: profile, isLoading: pLoading } = useCoachProfile();
  const { data: exercises, isLoading: exLoading } = useExercises({});
  const { data: programs, isLoading: prLoading } = usePrograms();
  const [dismissed, setDismissed] = React.useState(true); // default hidden until we read localStorage

  React.useEffect(() => {
    setDismissed(typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const loading = pLoading || exLoading || prLoading;

  if (loading) return <Skeleton className="h-56 w-full max-w-xl" />;
  if (!profile) return null;

  const steps = [
    {
      icon: User,
      done: !!(profile.bio || profile.avatarUrl),
      title: t('step1Title'),
      text: t('step1Text'),
      href: '/coach/profile',
    },
    {
      icon: Dumbbell,
      done: !!exercises && exercises.length > 0,
      title: t('step2Title'),
      text: t('step2Text'),
      href: '/coach/exercises',
    },
    {
      icon: PencilLine,
      done: !!programs && programs.length > 0,
      title: t('step3Title'),
      text: t('step3Text'),
      href: '/coach/programs/new',
    },
    {
      icon: CreditCard,
      done: !!profile.cardNumber,
      title: t('step4Title'),
      text: t('step4Text'),
      href: '/coach/intake',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // Once fully set up, the checklist has served its purpose — hide it for good.
  if (allDone || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <Card className="max-w-xl border-primary/30 bg-primary/5">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('progress', { done: doneCount, total: steps.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('dismiss')}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* progress bar */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        <ol className="space-y-1">
          {steps.map((step) => (
            <li key={step.title}>
              <Link
                href={step.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-background',
                  step.done && 'opacity-60',
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn('block font-medium', step.done && 'line-through')}>{step.title}</span>
                  {!step.done && <span className="block text-sm text-muted-foreground">{step.text}</span>}
                </span>
                {!step.done && <ChevronLeft className="size-4 shrink-0 text-muted-foreground rtl-flip" />}
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
