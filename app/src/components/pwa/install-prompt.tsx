'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'fitlo:install-dismissed';

/** Chrome/Edge/Android fire this; it isn't in the TS DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * "Add to home screen" prompt. On Chromium we defer the native
 * `beforeinstallprompt` and trigger it from our own button; iOS Safari never
 * fires that event, so there we show the manual Share → Add to Home Screen hint.
 * Dismissal is remembered so we never nag.
 */
export function InstallPrompt() {
  const t = useTranslations('pwa');
  const tc = useTranslations('common');
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [iosHint, setIosHint] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone()) return; // already installed
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar; we drive the UI
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS gets no event — offer the manual instructions instead.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2500);
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
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
