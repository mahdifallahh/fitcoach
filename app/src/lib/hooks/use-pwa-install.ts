'use client';

import * as React from 'react';

/** Chrome/Edge/Android fire this; it isn't in the TS DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Shared access to the deferred `beforeinstallprompt` event + install state, so
 * both the auto-popup modal and the landing page's install section can trigger
 * the same native prompt without each wiring up their own listeners.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar; we drive the UI
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    return choice?.outcome ?? null;
  }, [deferred]);

  return { installed, canPrompt: !!deferred, install };
}
