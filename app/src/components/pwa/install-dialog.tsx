'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { manualInstallKey, usePwaInstall } from '@/lib/hooks/use-pwa-install';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Shared "install the app" modal, used by both the header button and the
 * auto-prompt on app entry. Just the one-tap native install button when the
 * browser offers it — same as the landing page's install action.
 *
 * Neither iOS Safari nor Android Chrome always exposes that native prompt
 * (iOS never does at all — Apple doesn't support the Web Install Prompt API;
 * Android only after its own engagement heuristic is met), so whenever there
 * is no button to show, the description swaps to the concrete manual steps
 * for whichever platform the visitor is actually on.
 */
export function InstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('pwa');
  const { canPrompt, install } = usePwaInstall();
  const manualKey = React.useMemo(manualInstallKey, []);

  async function onInstall() {
    const outcome = await install();
    if (outcome === 'accepted') onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Download className="size-6" />
          </div>
          <DialogTitle>{t('installTitle')}</DialogTitle>
          <DialogDescription>{canPrompt ? t('installText') : t(manualKey)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {canPrompt && (
            <Button className="w-full" size="lg" onClick={onInstall}>
              <Download className="size-4" />
              {t('install')}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            {t('later')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
