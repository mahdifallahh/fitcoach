'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from '@/i18n/routing';
import { isStandalone } from '@/lib/hooks/use-pwa-install';

// This component is mounted globally (in the locale layout) but only ever opens
// inside the app panels. Defer the dialog's chunk (Radix Dialog) so it never
// reaches the marketing landing/blog bundle, where the timer below never fires.
const InstallDialog = dynamic(() => import('./install-dialog').then((m) => m.InstallDialog), {
  ssr: false,
});

// Shown once per browser session (re-appears on a fresh app open), so entering
// the app reminds the user to install without nagging on every navigation.
const SESSION_KEY = 'fitlo:install-shown';
// Only auto-prompt inside the actual app panels — never block the marketing
// landing/blog, which already carry their own install section + header button.
const APP_AREAS = ['/coach', '/student', '/admin'];

/**
 * Auto-opens the install modal when the user enters the app on a device where
 * fitlo isn't installed yet. The header `InstallButton` is the always-available
 * manual path; this is the proactive nudge.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  // Gate the lazy dialog: it only mounts (and loads its chunk) once the app-area
  // timer fires — so marketing pages never pull it in.
  const [dialogMounted, setDialogMounted] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone()) return; // already installed → nothing to do
    if (!APP_AREAS.some((a) => pathname === a || pathname.startsWith(`${a}/`))) return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return; // already shown this session

    const timer = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setDialogMounted(true);
      setOpen(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  return dialogMounted ? <InstallDialog open={open} onOpenChange={setOpen} /> : null;
}
