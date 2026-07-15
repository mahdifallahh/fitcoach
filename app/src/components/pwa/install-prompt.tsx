'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isIos, isStandalone, usePwaInstall } from '@/lib/hooks/use-pwa-install';

const DISMISS_KEY = 'fitlo:install-dismissed';

/**
 * "Add to home screen" prompt. On Chromium we defer the native
 * `beforeinstallprompt` and trigger it from our own button; iOS Safari never
 * fires that event, so there we show the manual Share → Add to Home Screen hint.
 * Dismissal is remembered so we never nag — the landing page's permanent install
 * section (`PwaInstallSection`) is the fallback for anyone who dismissed this.
 */
export function InstallPrompt() {
  const t = useTranslations('pwa');
  const tc = useTranslations('common');
  const { installed, canPrompt, install: doInstall } = usePwaInstall();
  const [visible, setVisible] = React.useState(false);
  const [iosHint, setIosHint] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone()) return; // already installed
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // iOS gets no beforeinstallprompt event — show the manual instructions right away.
    if (isIos()) {
      setIosHint(true);
      setVisible(true);
    }
  }, []);

  // Chromium: reveal once the browser offers a deferred prompt to trigger.
  React.useEffect(() => {
    if (canPrompt && localStorage.getItem(DISMISS_KEY) !== '1') setVisible(true);
  }, [canPrompt]);

  React.useEffect(() => {
    if (installed) setVisible(false);
  }, [installed]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  async function install() {
    await doInstall();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('installTitle')}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-lg sm:inset-x-auto sm:end-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {iosHint ? <Share className="size-5" /> : <Download className="size-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold">{t('installTitle')}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {iosHint ? t('iosHint') : t('installText')}
          </p>

          <div className="mt-3 flex gap-2">
            {!iosHint && (
              <Button size="sm" onClick={install}>
                <Download className="size-4" />
                {t('install')}
              </Button>
            )}
            <Button size="sm" variant={iosHint ? 'default' : 'ghost'} onClick={dismiss}>
              {iosHint ? t('gotIt') : t('later')}
            </Button>
          </div>
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
