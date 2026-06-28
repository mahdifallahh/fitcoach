'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Dumbbell, FolderCog, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { Exercise } from '@/lib/api/types';
import { useExercises, useDeleteExercise } from '@/lib/query/use-exercises';
import { useCategories } from '@/lib/query/use-categories';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseFormDialog } from './exercise-form-dialog';
import { CategoryManager } from './category-manager';

export function ExerciseLibrary() {
  const t = useTranslations('exercises');
  const { data: categories } = useCategories();
  const [search, setSearch] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: exercises, isLoading } = useExercises({
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
  });
  const remove = useDeleteExercise();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Exercise | null>(null);
  const [catOpen, setCatOpen] = React.useState(false);

  const isFiltered = !!debouncedSearch || !!categoryId;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(ex: Exercise) {
    setEditing(ex);
    setFormOpen(true);
  }
  function onDelete(ex: Exercise) {
    if (!confirm(t('deleteConfirmBody', { name: ex.name }))) return;
    remove.mutate(ex.id, { onSuccess: () => toast.success(t('deleted')) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" aria-label={t('manageCategories')} onClick={() => setCatOpen(true)}>
            <FolderCog className="size-4" />
            <span className="hidden sm:inline">{t('manageCategories')}</span>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('new')}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select className="sm:w-56" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">{t('allCategories')}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState message={isFiltered ? t('emptyFiltered') : t('empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} setsReps={t('setsReps', { sets: ex.defaultSets, reps: ex.defaultReps })} onEdit={() => openEdit(ex)} onDelete={() => onDelete(ex)} />
          ))}
        </div>
      )}

      <ExerciseFormDialog open={formOpen} onOpenChange={setFormOpen} exercise={editing} />
      <CategoryManager open={catOpen} onOpenChange={setCatOpen} />
    </div>
  );
}

function ExerciseCard({
  ex,
  setsReps,
  onEdit,
  onDelete,
}: {
  ex: Exercise;
  setsReps: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex gap-3 p-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {ex.gifUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ex.gifUrl} alt="" className="size-full object-cover" />
          ) : (
            <Dumbbell className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate font-medium">{ex.name}</p>
          <p className="text-sm text-muted-foreground">{setsReps}</p>
          {ex.category && (
            <Badge variant="secondary" className="mt-1 w-fit">
              {ex.category.name}
            </Badge>
          )}
          <div className="mt-auto flex justify-end gap-1 pt-1">
            <Button size="icon" variant="ghost" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <Dumbbell className="mb-3 size-10 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
