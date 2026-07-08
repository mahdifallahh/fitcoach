'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Dumbbell, Plus, Search } from 'lucide-react';
import type { Exercise } from '@/lib/api/types';
import { useExercises } from '@/lib/query/use-exercises';
import { useCategories } from '@/lib/query/use-categories';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (ex: Exercise) => void;
  title: string;
}) {
  const t = useTranslations('exercises');
  const { data: categories } = useCategories();
  const [search, setSearch] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const ds = useDebounce(search, 250);
  const { data: exercises, isLoading } = useExercises({
    search: ds || undefined,
    categoryId: categoryId || undefined,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="ps-9" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <Select className="sm:w-40" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('allCategories')}</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : !exercises || exercises.length === 0 ? (
            <li className="py-8 text-center text-sm text-muted-foreground">{t('emptyFiltered')}</li>
          ) : (
            exercises.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => onPick(ex)}
                  className="flex w-full items-center gap-3 rounded-md border p-2 text-start transition-colors hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {ex.gifUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ex.gifUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Dumbbell className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{ex.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ex.defaultSets} × {ex.defaultReps}
                    </span>
                  </span>
                  {ex.category && <Badge variant="secondary">{ex.category.name}</Badge>}
                  <Plus className="size-4 text-primary" />
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
