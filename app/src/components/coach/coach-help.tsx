'use client';

import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Eye,
  FolderCog,
  Inbox,
  LayoutTemplate,
  Layers,
  LifeBuoy,
  Link2,
  MessageCircle,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { CONTACT } from '@/components/shared/public-footer';

/**
 * Coach help center — every "how do I…" answered in one place, as an accessible
 * native-`<details>` accordion (no JS needed to open/close). Each topic pairs a
 * short intro with numbered steps and a shortcut to the relevant panel.
 * Copy lives in messages under `coachHelp.topics.<id>` (title/intro/steps[]).
 */
const TOPICS = [
  { id: 'addExercise', icon: Dumbbell, href: '/coach/exercises' },
  { id: 'categories', icon: FolderCog, href: '/coach/exercises' },
  { id: 'buildProgram', icon: ClipboardList, href: '/coach/programs/new' },
  { id: 'supersets', icon: Layers, href: '/coach/programs/new' },
  { id: 'templates', icon: LayoutTemplate, href: '/coach/templates' },
  { id: 'studentView', icon: Eye, href: undefined },
  { id: 'publicLink', icon: Link2, href: '/coach/profile' },
  { id: 'requestForm', icon: Inbox, href: '/coach/requests' },
  { id: 'cardNumber', icon: CreditCard, href: '/coach/intake' },
] as const;

export function CoachHelp() {
  const t = useTranslations('coachHelp');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LifeBuoy className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {TOPICS.map(({ id, icon: Icon, href }, i) => (
          <details
            key={id}
            open={i === 0}
            className="group rounded-xl border bg-card transition-colors open:border-primary/40 open:bg-primary/[0.03]"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <span className="flex-1 font-semibold">{t(`topics.${id}.title`)}</span>
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="space-y-3 px-4 pb-4 ps-16">
              <p className="text-sm text-muted-foreground">{t(`topics.${id}.intro`)}</p>
              <ol className="space-y-2">
                {(t.raw(`topics.${id}.steps`) as string[]).map((step, si) => (
                  <li key={si} className="flex gap-2.5 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {si + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              {href && (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t('open')}
                  <ChevronDown className="size-4 -rotate-90 rtl-flip" />
                </Link>
              )}
            </div>
          </details>
        ))}
      </div>

      {/* Still stuck? contact */}
      <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="size-5 shrink-0 text-primary" />
          <p className="text-sm">{t('contactTitle')}</p>
        </div>
        <a
          href={CONTACT.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('contactCta')}
        </a>
      </div>
    </div>
  );
}
