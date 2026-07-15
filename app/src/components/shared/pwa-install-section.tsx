'use client';

import { useTranslations } from 'next-intl';
import { Apple, CheckCircle2, Download, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/lib/hooks/use-pwa-install';

/**
 * Permanent "install the app" section on the landing page — the fallback for
 * anyone who dismissed (or missed) the auto-popup `InstallPrompt` modal.
 */
export function PwaInstallSection() {
  const t = useTranslations('landing.pwaSection');
  const { installed, canPrompt, install } = usePwaInstall();

  const platforms = [
    { icon: Apple, label: t('iphone') },
    { icon: Smartphone, label: t('android') },
    { icon: Monitor, label: t('desktop') },
  ];

  return (
    <section className="border-t bg-muted/30 py-16">
      <div className="container flex flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="max-w-lg text-muted-foreground">{t('subtitle')}</p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {platforms.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
              <Icon className="size-4 text-primary" />
              {label}
            </div>
          ))}
        </div>

        {installed ? (
          <p className="flex items-center gap-2 font-medium text-primary">
            <CheckCircle2 className="size-5" />
            {t('alreadyInstalled')}
          </p>
        ) : canPrompt ? (
          <Button size="lg" onClick={install}>
            <Download className="size-4" />
            {t('installNow')}
          </Button>
        ) : (
          <p className="max-w-sm text-sm text-muted-foreground">{t('manualHint')}</p>
        )}
      </div>
    </section>
  );
}
