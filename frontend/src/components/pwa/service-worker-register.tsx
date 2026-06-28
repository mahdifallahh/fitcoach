'use client';

import { useEffect } from 'react';

/** Registers the app-shell service worker (offline support + installability). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      });
    }
  }, []);
  return null;
}
