'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';
import { Dumbbell, GripVertical, Layers, Plus, Trash2, X } from 'lucide-react';
import type { BuilderItem, BuilderRow } from './types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RowCallbacks {
  onUpdateItem: (rowUid: string, itemUid: string, patch: Partial<BuilderItem>) => void;
  onRemoveItem: (rowUid: string, itemUid: string) => void;
  onRemoveRow: (rowUid: string) => void;
  onAddPartner: (rowUid: string) => void;
}

export function DayRow({ row, ...cb }: { row: BuilderRow } & RowCallbacks) {
  const t = useTranslations('builder');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.uid });
  const isSuperset = row.type === 'superset' && row.items.length > 1;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-lg border bg-card',
        isSuperset && 'border-primary/40 bg-primary/5',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <div className="flex items-start gap-2 p-2">
        <button
          type="button"
          className="mt-2 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={t('drag')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          {isSuperset && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Layers className="size-3.5" /> {t('superset')}
            </div>
          )}

          {row.items.map((item) => (
            <ItemEditor
              key={item.uid}
              item={item}
              showRemove={isSuperset}
              onChange={(patch) => cb.onUpdateItem(row.uid, item.uid, patch)}
              onRemove={() => cb.onRemoveItem(row.uid, item.uid)}
            />
          ))}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-primary" onClick={() => cb.onAddPartner(row.uid)}>
              {isSuperset ? <Plus className="size-3.5" /> : <Layers className="size-3.5" />}
              {isSuperset ? t('addToSuperset') : t('makeSuperset')}
            </Button>
          </div>
        </div>

        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t('removeRow')} onClick={() => cb.onRemoveRow(row.uid)}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  showRemove,
  onChange,
  onRemove,
}: {
  item: BuilderItem;
  showRemove: boolean;
  onChange: (patch: Partial<BuilderItem>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('builder');
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {item.gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.gifUrl} alt="" className="size-full object-cover" />
        ) : (
          <Dumbbell className="size-4 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
      <Input
        type="number"
        min={1}
        max={50}
        aria-label={t('sets')}
        className="h-9 w-14 text-center"
        value={item.sets}
        onChange={(e) => onChange({ sets: Number(e.target.value) || 1 })}
      />
      <span className="text-muted-foreground">×</span>
      <Input
        aria-label={t('reps')}
        dir="ltr"
        className="h-9 w-16 text-center"
        value={item.reps}
        onChange={(e) => onChange({ reps: e.target.value })}
      />
      {showRemove && (
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={t('removeItem')} onClick={onRemove}>
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
