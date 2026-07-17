'use client';

import * as React from 'react';
import { usePathname } from '@/i18n/routing';
import { isStandalone } from '@/lib/hooks/use-pwa-install';
import { InstallDialog } from './install-dialog';

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

  React.useEffect(() => {
    if (isStandalone()) return; // already installed → nothing to do
    if (!APP_AREAS.some((a) => pathname === a || pathname.startsWith(`${a}/`))) return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return; // already shown this session

    const timer = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setOpen(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  return <InstallDialog open={open} onOpenChange={setOpen} />;
}
