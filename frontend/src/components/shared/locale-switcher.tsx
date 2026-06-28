'use client';

import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';
import { usePathname, useRouter, routing, localeLabels, type Locale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

/** Switches locale while preserving the current path (next-intl navigation). */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const other = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      onClick={() => router.replace(pathname, { locale: other })}
      aria-label={localeLabels[other]}
    >
      <Languages className="size-4" />
      <span>{localeLabels[other]}</span>
    </Button>
  );
}
