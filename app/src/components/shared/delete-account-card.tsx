'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useMe } from '@/lib/query/use-auth';
import { useDeleteAccount } from '@/lib/query/use-account';
import { apiErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Danger zone: permanent account deletion.
 *
 * Deliberately high-friction, per common practice for irreversible actions:
 * the destructive button only opens a dialog, and the dialog requires BOTH the
 * account password (server-side re-authentication) and typing a confirmation
 * word, so it can't be triggered by a stray click or an unattended session.
 * Coaches are warned explicitly that their programs and students go with it.
 */
export function DeleteAccountCard() {
  const t = useTranslations('deleteAccount');
  const { data: me } = useMe();
  const del = useDeleteAccount();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmText, setConfirmText] = React.useState('');

  const confirmWord = t('confirmWord');
  const canSubmit = password.length > 0 && confirmText.trim() === confirmWord;

  function onDelete() {
    if (!canSubmit) return;
    del.mutate(password, {
      onSuccess: () => {
        toast.success(t('deleted'));
        // Full reload to a public page: every cached query and the session
        // cookie are gone, so a client-side transition would race the guards.
        window.location.href = '/';
      },
      onError: (e) => toast.error(apiErrorMessage(e, t('error'))),
    });
  }

  React.useEffect(() => {
    if (!open) {
      setPassword('');
      setConfirmText('');
    }
  }, [open]);

  return (
    <Card className="border-destructive/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
        </div>

        <ul className="list-inside list-disc space-y-1 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <li>{me?.isCoach ? t('warnCoach') : t('warnStudent')}</li>
          <li>{t('warnIrreversible')}</li>
        </ul>

        <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
          {t('cta')}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialogTitle')}</DialogTitle>
            <DialogDescription>{t('dialogBody')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="del-password">{t('passwordLabel')}</Label>
              <Input
                id="del-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="del-confirm">{t('confirmLabel', { word: confirmWord })}</Label>
              <Input
                id="del-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmWord}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={del.isPending}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={!canSubmit || del.isPending}
            >
              {del.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {t('confirmCta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
