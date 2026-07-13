'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Info, X } from 'lucide-react';

/**
 * Dismissible "how this section works" note. Shown until the user closes it, then
 * remembered per `storageKey` so we explain once instead of nagging forever.
 */
export function HelpCallout({
  storageKey,
  title,
  items,
}: {
  storageKey: string;
  title: string;
  items: React.ReactNode[];
}) {
  const tc = useTranslations('common');
  // Start hidden so a dismissed callout never flashes before localStorage is read.
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(localStorage.getItem(storageKey) !== '1');
  }, [storageKey]);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={tc('close')}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
