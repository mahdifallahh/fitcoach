'use client';

import { useEffect } from 'react';

/**
 * Registers the app-shell service worker (offline support + installability) —
 * production only. In dev the SW would serve stale `/_next/static` chunks
 * (dev chunk names aren't content-hashed), so we unregister and clear caches.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => undefined);
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration failures are non-fatal */
    });
  }, []);
  return null;
}
