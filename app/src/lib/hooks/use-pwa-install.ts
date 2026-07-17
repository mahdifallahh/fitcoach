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

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/** Which manual-install message fits this device — shared by every install entry point. */
export function manualInstallKey(): 'manualIos' | 'manualAndroid' | 'manualDesktop' {
  if (isIos()) return 'manualIos';
  if (isAndroid()) return 'manualAndroid';
  return 'manualDesktop';
}

/**
 * Module-level store (not component state): the browser fires
 * `beforeinstallprompt` at most once per page load, at a time no component
 * controls. If each `usePwaInstall()` call kept its own local state, only
 * whichever component happened to be mounted at that exact moment would ever
 * see `canPrompt: true` — e.g. the landing page's install section would catch
 * it, but the header button mounted after a client-side navigation into the
 * app never would, even though the browser is still holding the same event.
 * Listening once at module scope and fanning out via `useSyncExternalStore`
 * means every consumer, mounted at any time, shares the one captured event.
 */
let deferredEvent: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function initGlobalListenersOnce() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __fitloPwaInit?: boolean };
  if (w.__fitloPwaInit) return;
  w.__fitloPwaInit = true;

  installedFlag = isStandalone();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // stop the mini-infobar; we drive the UI
    deferredEvent = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    deferredEvent = null;
    notify();
  });
}
initGlobalListenersOnce();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Shared access to the deferred `beforeinstallprompt` event + install state, so
 * every install entry point (header button, auto-popup modal, landing page's
 * install section) reflects the same underlying browser event, however and
 * whenever each of them mounts.
 */
export function usePwaInstall() {
  const installed = React.useSyncExternalStore(subscribe, () => installedFlag, () => false);
  const canPrompt = React.useSyncExternalStore(subscribe, () => !!deferredEvent, () => false);

  const install = React.useCallback(async () => {
    if (!deferredEvent) return null;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice.catch(() => undefined);
    deferredEvent = null;
    notify();
    return choice?.outcome ?? null;
  }, []);

  return { installed, canPrompt, install };
}
