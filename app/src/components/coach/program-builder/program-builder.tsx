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
import { Loader2, Plus, Save, Send } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import type { Exercise, ProgramStatus2 } from '@/lib/api/types';
import { useProgram, useCreateProgram, useUpdateProgram } from '@/lib/query/use-programs';
import { apiErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProgramDraft } from './use-program-draft';
import { blankState, daysToPayload, itemFromExercise, parseStat, stateFromProgram } from './types';
import { DayRow } from './day-row';
import { ExercisePicker } from './exercise-picker';

export function ProgramBuilder({
  programId,
  initialContact,
  initialRequestId,
}: {
  programId?: string;
  initialContact?: string;
  /** When arriving from a program request: mark it ACCEPTED once the program is saved. */
  initialRequestId?: string;
}) {
  const t = useTranslations('builder');
  const tf = useTranslations('forms');
  const router = useRouter();
  const isEdit = !!programId;

  const { data: existing, isError } = useProgram(programId);
  const draft = useProgramDraft(blankState());
  const create = useCreateProgram();
  const update = useUpdateProgram();

  const [ready, setReady] = React.useState(!isEdit);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [picker, setPicker] = React.useState<{ open: boolean; targetRowUid?: string }>({ open: false });
  const [attempted, setAttempted] = React.useState(false);

  React.useEffect(() => {
    if (existing && !ready) {
      draft.load(stateFromProgram(existing));
      setReady(true);
    }
  }, [existing, ready, draft]);

  // Prefill the student contact when arriving from a program request ("Start program").
  const contactInit = React.useRef(false);
  React.useEffect(() => {
    if (!isEdit && initialContact && !contactInit.current) {
      contactInit.current = true;
      draft.setMeta('studentContact', initialContact);
    }
  }, [isEdit, initialContact, draft]);

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

  const save = (status: ProgramStatus2) => {
    setAttempted(true);
    if (!state.meta.studentContact.trim() || !state.meta.name.trim()) {
      toast.error(t('missingMeta'));
      return;
    }
    const common = {
      name: state.meta.name.trim(),
      daysPerWeek: state.daysPerWeek,
      age: parseStat(state.meta.age),
      heightCm: parseStat(state.meta.heightCm),
      weightKg: parseStat(state.meta.weightKg),
      status,
      days: daysToPayload(state.days),
    };
    const opts = {
      onSuccess: () => {
        toast.success(status === 'PUBLISHED' ? t('published') : t('savedDraft'));
        router.push('/coach/programs');
      },
      onError: (err: unknown) => toast.error(apiErrorMessage(err, t('saveError'))),
    };
    if (isEdit && programId) update.mutate({ id: programId, payload: common }, opts);
    else
      create.mutate(
        { studentContact: state.meta.studentContact.trim(), requestId: initialRequestId, ...common },
        opts,
      );
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
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => save('DRAFT')}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('saveDraft')}
          </Button>
          <Button disabled={pending} onClick={() => save('PUBLISHED')}>
            <Send className="size-4" />
            {t('publish')}
          </Button>
        </div>
      </div>

      {/* Meta */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact">{t('studentContact')}</Label>
            <Input
              id="contact"
              dir="ltr"
              disabled={isEdit}
              value={state.meta.studentContact}
              onChange={(e) => draft.setMeta('studentContact', e.target.value)}
            />
            {attempted && !state.meta.studentContact.trim() && (
              <p className="text-sm text-destructive">{tf('fieldRequired')}</p>
            )}
            {!isEdit && <p className="text-xs text-muted-foreground">{t('contactHint')}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pname">{t('name')}</Label>
            <Input
              id="pname"
              placeholder={t('namePlaceholder')}
              value={state.meta.name}
              onChange={(e) => draft.setMeta('name', e.target.value)}
            />
            {attempted && !state.meta.name.trim() && <p className="text-sm text-destructive">{tf('fieldRequired')}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
            <Field label={t('age')} value={state.meta.age} onChange={(v) => draft.setMeta('age', v)} />
            <Field label={t('height')} value={state.meta.heightCm} onChange={(v) => draft.setMeta('heightCm', v)} />
            <Field label={t('weight')} value={state.meta.weightKg} onChange={(v) => draft.setMeta('weightKg', v)} />
            <div className="space-y-2">
              <Label htmlFor="dpw">{t('daysPerWeek')}</Label>
              <Input
                id="dpw"
                type="number"
                min={1}
                max={14}
                value={state.daysPerWeek}
                onChange={(e) => draft.setDaysPerWeek(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
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
      </div>

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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
