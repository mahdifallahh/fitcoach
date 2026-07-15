'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { LayoutTemplate, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { ProgramTemplateListItem } from '@/lib/api/types';
import { useTemplates, useDeleteTemplate } from '@/lib/query/use-program-templates';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { apiErrorMessage } from '@/lib/api/client';
import { AssignTemplateDialog } from './assign-template-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export function TemplateList() {
  const t = useTranslations('templates');
  const tc = useTranslations('common');
  const format = useFormatter();

  const [search, setSearch] = React.useState('');
  const ds = useDebounce(search, 250);
  const { data, isLoading, isError, refetch } = useTemplates(ds || undefined);
  const del = useDeleteTemplate();

  const [assignFor, setAssignFor] = React.useState<ProgramTemplateListItem | null>(null);

  const isSearching = ds.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/coach/templates/new">
            <Plus className="size-4" />
            {t('new')}
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-9"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isError ? (
        <ErrorState message={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <LayoutTemplate className="mb-3 size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{isSearching ? t('emptyFiltered') : t('empty')}</p>
          {!isSearching && (
            <Button asChild variant="outline" className="mt-4">
              <Link href="/coach/templates/new">
                <Plus className="size-4" />
                {t('new')}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <span className="truncate font-semibold">{tpl.name}</span>
                  {tpl.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{tpl.description}</p>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t('daysCount', { count: tpl._count.days })} · {t('daysPerWeek', { n: tpl.daysPerWeek })} ·{' '}
                    {t('updatedAt', {
                      date: format.dateTime(new Date(tpl.updatedAt), { dateStyle: 'medium' }),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={() => setAssignFor(tpl)}>
                    <Send className="size-4" />
                    {t('assign')}
                  </Button>
                  <Button asChild variant="ghost" size="icon">
                    <Link href={`/coach/templates/${tpl.id}/edit`} aria-label={t('edit')}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('delete')}
                    onClick={() => {
                      if (confirm(t('deleteConfirm', { name: tpl.name }))) {
                        del.mutate(tpl.id, {
                          onSuccess: () => toast.success(t('deleted')),
                          onError: (err) => toast.error(apiErrorMessage(err, t('deleteError'))),
                        });
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AssignTemplateDialog
        open={!!assignFor}
        onOpenChange={(o) => !o && setAssignFor(null)}
        template={assignFor}
      />
    </div>
  );
}
