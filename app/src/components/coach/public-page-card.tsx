'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  Lightbulb,
  Link2,
  Share2,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { CoachProfile } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * The coach's link-in-bio page, explained in place: what it is, a live preview of
 * exactly what students see, one-tap copy/share, and a readiness checklist for the
 * fields that actually show up on it.
 *
 * The link always points at the **saved** handle — if the coach has typed a new one
 * but not saved yet, we say so instead of handing them a URL that 404s.
 */
export function PublicPageCard({
  profile,
  typedHandle,
  handleInput,
}: {
  profile: CoachProfile;
  /** Live value from the form (may differ from the saved handle). */
  typedHandle: string;
  /** The RHF-registered handle input, rendered by the parent form. */
  handleInput: React.ReactNode;
}) {
  const t = useTranslations('publicPage');
  const locale = useLocale();
  const [copied, setCopied] = React.useState(false);
  const [preview, setPreview] = React.useState(false);

  const savedHandle = profile.handle ?? '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = savedHandle ? `${origin}/${locale}/c/${savedHandle}` : '';
  const unsaved = !!typedHandle && typedHandle !== savedHandle;

  const steps = [
    { done: !!savedHandle, label: t('item_handle'), href: undefined },
    { done: !!profile.avatarUrl, label: t('item_avatar'), href: undefined },
    { done: !!profile.bio, label: t('item_bio'), href: undefined },
    {
      done: !!profile.cardNumber && !!profile.programPrice,
      label: t('item_payment'),
      href: '/coach/intake' as const,
    },
  ];
  const done = steps.filter((s) => s.done).length;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('copyError'));
    }
  }

  async function share() {
    // Native share sheet on mobile; fall back to copying.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: profile.name, url: publicUrl });
        return;
      } catch {
        return; // user cancelled — not an error
      }
    }
    copyLink();
  }

  return (
    <Card id="public-page" className="scroll-mt-24 border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-4">
        {/* What this is */}
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Link2 className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('what')}</p>
          </div>
        </div>

        {/* Handle input (owned by the parent form) */}
        {handleInput}

        {/* Live link + actions */}
        {savedHandle ? (
          <div className="space-y-2 rounded-lg border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">{t('linkLabel')}</p>
            <code className="block truncate text-xs" dir="ltr">
              {publicUrl}
            </code>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" onClick={() => setPreview(true)}>
                <Eye className="size-4" /> {t('preview')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={share}>
                <Share2 className="size-4" /> {t('share')}
              </Button>
              <Button asChild type="button" size="sm" variant="ghost">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" /> {t('open')}
                </a>
              </Button>
            </div>

            {unsaved && (
              <p className="flex items-start gap-1.5 pt-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                {t('unsaved')}
              </p>
            )}
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {t('noHandle')}
          </p>
        )}

        {/* Readiness checklist — what students will (or won't) see */}
        <div className="rounded-lg border bg-background p-3">
          <p className="mb-2 text-sm font-medium">
            {t('checklistTitle')}{' '}
            <span className="font-normal text-muted-foreground">
              ({t('checklistProgress', { done, total: steps.length })})
            </span>
          </p>
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={s.done ? 'text-muted-foreground line-through' : ''}>{s.label}</span>
                {!s.done && s.href && (
                  <Link href={s.href} className="ms-auto text-xs font-medium text-primary hover:underline">
                    {t('fix')}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Tip */}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lightbulb className="mt-px size-3.5 shrink-0 text-amber-500" />
          {t('tip')}
        </p>
      </CardContent>

      {/* Preview: exactly what a student sees, without leaving the page */}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('previewTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('previewNote')}</p>
          {publicUrl && (
            <iframe
              src={publicUrl}
              title={t('previewTitle')}
              className="h-[60vh] w-full rounded-lg border bg-background"
            />
          )}
          <Button asChild variant="outline">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> {t('open')}
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
