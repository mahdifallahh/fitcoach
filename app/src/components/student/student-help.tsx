'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Info, X, ClipboardList, Link2, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const DISMISS_KEY = 'fitlo:student-help-dismissed';

/** Short, dismissible "how it works" note for students who may be unsure what to do. */
export function StudentHelp() {
  const t = useTranslations('studentHome');
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    setDismissed(typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  const items = [
    { icon: ClipboardList, text: t('help1') },
    { icon: Link2, text: t('help2') },
    { icon: Bell, text: t('help3') },
  ];

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="flex items-center gap-2 font-semibold">
            <Info className="size-4 text-primary" /> {t('helpTitle')}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('helpDismiss')}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary/70" />
              {text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
