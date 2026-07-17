'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Download, Info } from 'lucide-react';
import { isIos, usePwaInstall } from '@/lib/hooks/use-pwa-install';
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
 * auto-prompt on app entry. Offers the one-tap native install when the browser
 * exposes it (Chromium `beforeinstallprompt`), and always shows concrete
 * per-platform manual steps as a fallback (iOS never fires the native event).
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

  const manualKey = React.useMemo<'manualIos' | 'manualAndroid' | 'manualDesktop'>(() => {
    if (typeof navigator === 'undefined') return 'manualDesktop';
    if (isIos()) return 'manualIos';
    if (/android/i.test(navigator.userAgent)) return 'manualAndroid';
    return 'manualDesktop';
  }, []);

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
          <DialogDescription>{t('installText')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {canPrompt && (
            <Button className="w-full" size="lg" onClick={onInstall}>
              <Download className="size-4" />
              {t('install')}
            </Button>
          )}

          {/* Manual steps for this device — the reliable fallback (and the only
              path on iOS). */}
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-start text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">{t('howToInstall')}</span> {t(manualKey)}
            </span>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            {t('later')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
