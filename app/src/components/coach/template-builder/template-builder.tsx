'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2, Plus, Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import type { Exercise } from '@/lib/api/types';
import { useTemplate, useCreateTemplate, useUpdateTemplate } from '@/lib/query/use-program-templates';
import { useWriteAccess } from '@/lib/hooks/use-write-access';
import { apiErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProgramDraft } from '@/components/coach/program-builder/use-program-draft';
import {
  blankState,
  daysToBuilderDays,
  daysToPayload,
  emptyDay,
  itemFromExercise,
} from '@/components/coach/program-builder/types';
import { DayRow } from '@/components/coach/program-builder/day-row';
import { ExercisePicker } from '@/components/coach/program-builder/exercise-picker';
import { ScrollableTabs } from '@/components/shared/scrollable-tabs';

export function TemplateBuilder({ templateId }: { templateId?: string }) {
  const t = useTranslations('templateBuilder');
  const tf = useTranslations('forms');
  const tb = useTranslations('billing');
  const router = useRouter();
  const isEdit = !!templateId;
  const { canWrite } = useWriteAccess();

  const { data: existing, isError } = useTemplate(templateId);
  const draft = useProgramDraft(blankState());
  const create = useCreateTemplate();
  const update = useUpdateTemplate();

  const [description, setDescription] = React.useState('');
  const [ready, setReady] = React.useState(!isEdit);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [picker, setPicker] = React.useState<{ open: boolean; targetRowUid?: string }>({ open: false });
  const [attempted, setAttempted] = React.useState(false);

  React.useEffect(() => {
    if (existing && !ready) {
      const days = daysToBuilderDays(existing.days);
      draft.load({
        meta: { studentContact: '', name: existing.name, age: '', heightCm: '', weightKg: '' },
        daysPerWeek: existing.daysPerWeek,
        days: days.length ? days : [emptyDay(1)],
      });
      setDescription(existing.description ?? '');
      setReady(true);
    }
  }, [existing, ready, draft]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const state = draft.state;
  const activeDay = state.days[Math.min(activeIdx, state.days.length - 1)];

  const onPick = (ex: Exercise) => {
    const item = itemFromExercise(ex);
    if (picker.targetRowUid) {
      draft.addToSuperset(activeDay.uid, picker.targetRowUid, item);
      setPicker({ open: false });
    } else {
      draft.addRow(activeDay.uid, item); // keep picker open for rapid multi-add
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const rows = activeDay.rows;
    const oi = rows.findIndex((r) => r.uid === active.id);
    const ni = rows.findIndex((r) => r.uid === over.id);
    if (oi < 0 || ni < 0) return;
    draft.reorderRows(activeDay.uid, arrayMove(rows, oi, ni));
  };

  const pending = create.isPending || update.isPending;

  const save = () => {
    setAttempted(true);
    if (!state.meta.name.trim()) {
      toast.error(t('missingName'));
      return;
    }
    const payload = {
      name: state.meta.name.trim(),
      description: description.trim() || undefined,
      daysPerWeek: state.daysPerWeek,
      days: daysToPayload(state.days),
    };
    const opts = {
      onSuccess: () => {
        toast.success(t('saved'));
        router.push('/coach/templates');
      },
      onError: (err: unknown) => toast.error(apiErrorMessage(err, t('saveError'))),
    };
    if (isEdit && templateId)
      update.mutate({ id: templateId, payload: { ...payload, description: description.trim() || null } }, opts);
    else create.mutate(payload, opts);
  };

  if (isEdit && isError) {
    return <p className="py-10 text-center text-muted-foreground">{t('loadError')}</p>;
  }
  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{isEdit ? t('editTitle') : t('newTitle')}</h1>
        <Button disabled={pending || !canWrite} title={canWrite ? undefined : tb('lockedTitle')} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t('save')}
        </Button>
      </div>

      {/* Meta */}
      <Card>
        <CardContent className="grid gap-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="tname">{t('name')}</Label>
            <Input
              id="tname"
              placeholder={t('namePlaceholder')}
              value={state.meta.name}
              onChange={(e) => draft.setMeta('name', e.target.value)}
            />
            {attempted && !state.meta.name.trim() && <p className="text-sm text-destructive">{tf('fieldRequired')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tdesc">{t('description')}</Label>
            <Textarea
              id="tdesc"
              rows={2}
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="max-w-[10rem] space-y-2">
            <Label htmlFor="tdpw">{t('daysPerWeek')}</Label>
            <Input
              id="tdpw"
              type="number"
              min={1}
              max={14}
              value={state.daysPerWeek}
              onChange={(e) => draft.setDaysPerWeek(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Day tabs */}
      <ScrollableTabs className="border-b" viewportClassName="gap-1">
        {state.days.map((d, i) => (
          <button
            key={d.uid}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              i === Math.min(activeIdx, state.days.length - 1)
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t('day', { n: d.dayIndex })}
          </button>
        ))}
      </ScrollableTabs>

      {/* Active day */}
      {activeDay && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs"
              placeholder={t('dayTitlePlaceholder')}
              value={activeDay.title}
              onChange={(e) => draft.setDayTitle(activeDay.uid, e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => setPicker({ open: true })}>
              <Plus className="size-4" /> {t('addExercise')}
            </Button>
          </div>

          {activeDay.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              {t('emptyDay')}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={activeDay.rows.map((r) => r.uid)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {activeDay.rows.map((row) => (
                    <DayRow
                      key={row.uid}
                      row={row}
                      onUpdateItem={(rowUid, itemUid, patch) => draft.updateItem(activeDay.uid, rowUid, itemUid, patch)}
                      onRemoveItem={(rowUid, itemUid) => draft.removeItem(activeDay.uid, rowUid, itemUid)}
                      onRemoveRow={(rowUid) => draft.removeRow(activeDay.uid, rowUid)}
                      onAddPartner={(rowUid) => setPicker({ open: true, targetRowUid: rowUid })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <ExercisePicker
        open={picker.open}
        onOpenChange={(o) => setPicker((p) => ({ ...p, open: o }))}
        onPick={onPick}
        title={picker.targetRowUid ? t('supersetPickerTitle') : t('pickerTitle')}
      />
    </div>
  );
}
