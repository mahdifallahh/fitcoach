'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Apple, CheckCircle2, Download, Info, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIos, usePwaInstall } from '@/lib/hooks/use-pwa-install';

/**
 * Permanent "install the app" section on the landing page — the fallback for
 * anyone who dismissed (or missed) the auto-popup `InstallPrompt` modal.
 *
 * The native `beforeinstallprompt` only fires on Chromium once its engagement
 * heuristic is met, and never on iOS — so we always fall back to concrete,
 * per-platform manual steps rather than leaving the user without a path.
 */
export function PwaInstallSection() {
  const t = useTranslations('landing.pwaSection');
  const { installed, canPrompt, install } = usePwaInstall();

  // Which manual instruction fits this device (used when there's no native prompt).
  const manualKey = React.useMemo<'manualIos' | 'manualAndroid' | 'manualDesktop'>(() => {
    if (typeof navigator === 'undefined') return 'manualDesktop';
    if (isIos()) return 'manualIos';
    if (/android/i.test(navigator.userAgent)) return 'manualAndroid';
    return 'manualDesktop';
  }, []);

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
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* One-tap install when the browser offers it… */}
            {canPrompt && (
              <Button size="lg" onClick={install}>
                <Download className="size-4" />
                {t('installNow')}
              </Button>
            )}
            {/* …and always the manual steps for this device as a reliable fallback. */}
            <div className="flex max-w-sm items-start gap-2 rounded-lg border bg-card p-3 text-start text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">{t('howToInstall')}</span>{' '}
                {t(manualKey)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
