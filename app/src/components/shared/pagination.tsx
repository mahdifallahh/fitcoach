'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Pager for the coach's list screens. Renders nothing for a single page, so a
 * small library never shows dead controls.
 *
 * Layout is mobile-first: the numbered buttons are a compact window around the
 * current page (with ellipses), and on narrow screens they collapse to a
 * "page X of Y" label so the row can't overflow the viewport. The chevrons use
 * logical `rtl-flip` so "next" still points forward in RTL.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  /** Total row count, shown as context ("۴۲ نتیجه"). */
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const t = useTranslations('pagination');
  const format = useFormatter();

  if (totalPages <= 1) return null;

  const go = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <nav
      aria-label={t('label')}
      className={cn('flex flex-wrap items-center justify-between gap-3 pt-2', className)}
    >
      <p className="text-xs text-muted-foreground">
        {total !== undefined
          ? t('summary', { total: format.number(total), page, totalPages })
          : t('pageOf', { page, totalPages })}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label={t('previous')}
        >
          <ChevronRight className="size-4 rtl-flip" />
        </Button>

        {/* Numbered window — hidden on the narrowest screens (label carries it). */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((p, i) =>
            p === ELLIPSIS ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className="size-9 text-sm"
                aria-current={p === page ? 'page' : undefined}
                onClick={() => go(p)}
              >
                {format.number(p)}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('next')}
        >
          <ChevronLeft className="size-4 rtl-flip" />
        </Button>
      </div>
    </nav>
  );
}

const ELLIPSIS = -1;

/**
 * Page numbers to render: always the first and last, plus a window around the
 * current page, with `ELLIPSIS` markers for the gaps. Keeps the control a fixed
 * width no matter how many pages exist.
 */
function pageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const out: number[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(ELLIPSIS);
    out.push(p);
    prev = p;
  }
  return out;
}
