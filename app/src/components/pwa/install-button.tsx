'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { isStandalone } from '@/lib/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InstallDialog } from './install-dialog';

/**
 * Persistent "Install app" button for the header. Hidden once the app is running
 * standalone (already installed). Opens the shared InstallDialog, which handles
 * both the native prompt and the per-platform manual steps.
 *
 * `iconOnly` collapses it to just the icon (tight mobile headers).
 */
export function InstallButton({
  className,
  iconOnly,
  variant = 'outline',
}: {
  className?: string;
  iconOnly?: boolean;
  variant?: 'outline' | 'ghost' | 'default';
}) {
  const t = useTranslations('pwa');
  // Server-render the button and keep its box while we check install state:
  // rendering null-until-hydrated made the whole header row shift when the
  // button popped in, which Lighthouse counts as CLS on every page view. Now
  // the space is reserved from the first paint (invisible until checked) and
  // only the rare already-installed/standalone case removes it.
  const [checked, setChecked] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandalone());
    setChecked(true);
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setInstalled(isStandalone());
    mq.addEventListener?.('change', onChange);
    window.addEventListener('appinstalled', onChange);
    return () => {
      mq.removeEventListener?.('change', onChange);
      window.removeEventListener('appinstalled', onChange);
    };
  }, []);

  if (checked && installed) return null;

  return (
    <>
      <Button
        variant={variant}
        size={iconOnly ? 'icon' : 'sm'}
        className={cn(!checked && 'invisible', className)}
        aria-label={t('installButton')}
        title={t('installButton')}
        onClick={() => setOpen(true)}
      >
        <Download className="size-4" />
        {!iconOnly && t('installButton')}
      </Button>
      <InstallDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
