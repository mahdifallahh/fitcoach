import type { ProgramDayPayload } from '@/lib/api/programs';
import type { Exercise, ProgramDetail } from '@/lib/api/types';

/** One exercise instance inside the builder (single row or superset member). */
export interface BuilderItem {
  uid: string;
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  sets: number;
  reps: string;
  notes?: string;
}

/** A top-level row in a day: either a single exercise or a grouped superset. */
export interface BuilderRow {
  uid: string;
  type: 'single' | 'superset';
  items: BuilderItem[];
}

export interface BuilderDay {
  uid: string;
  dayIndex: number;
  title: string;
  rows: BuilderRow[];
}

export interface BuilderMeta {
  studentContact: string;
  name: string;
  age: string; // kept as strings for controlled inputs
  heightCm: string;
  weightKg: string;
}

export interface BuilderState {
  meta: BuilderMeta;
  daysPerWeek: number;
  days: BuilderDay[];
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const newUid = uid;

export function itemFromExercise(ex: Exercise): BuilderItem {
  return {
    uid: uid(),
    exerciseId: ex.id,
    name: ex.name,
    gifUrl: ex.gifUrl,
    sets: ex.defaultSets,
    reps: ex.defaultReps,
  };
}

export function emptyDay(dayIndex: number): BuilderDay {
  return { uid: uid(), dayIndex, title: '', rows: [] };
}

export function blankState(): BuilderState {
  return {
    meta: { studentContact: '', name: '', age: '', heightCm: '', weightKg: '' },
    daysPerWeek: 3,
    days: [emptyDay(1), emptyDay(2), emptyDay(3)],
  };
}

/**
 * Map fetched program/template days (same shape) into builder days, regrouping
 * exercises that share a supersetGroupId back into superset rows. Shared by the
 * program builder and the template builder.
 */
export function daysToBuilderDays(days: ProgramDetail['days']): BuilderDay[] {
  return days.map((d) => {
    const rows: BuilderRow[] = [];
    const groups = new Map<string, BuilderRow>();
    for (const ex of d.exercises) {
      const item: BuilderItem = {
        uid: uid(),
        exerciseId: ex.exercise.id,
        name: ex.exercise.name,
        gifUrl: ex.exercise.gifUrl,
        sets: ex.sets,
        reps: ex.reps,
        notes: ex.notes ?? undefined,
      };
      if (ex.supersetGroupId) {
        let row = groups.get(ex.supersetGroupId);
        if (!row) {
          row = { uid: uid(), type: 'superset', items: [] };
          groups.set(ex.supersetGroupId, row);
          rows.push(row);
        }
        row.items.push(item);
      } else {
        rows.push({ uid: uid(), type: 'single', items: [item] });
      }
    }
    return { uid: uid(), dayIndex: d.dayIndex, title: d.title ?? '', rows };
  });
}

/** Build editor state from a fetched program (lossless round-trip). */
export function stateFromProgram(p: ProgramDetail): BuilderState {
  const days = daysToBuilderDays(p.days);

  return {
    meta: {
      studentContact: p.student.email ?? p.student.phone ?? '',
      name: p.name,
      age: p.studentAge?.toString() ?? '',
      heightCm: p.studentHeightCm?.toString() ?? '',
      weightKg: p.studentWeightKg?.toString() ?? '',
    },
    daysPerWeek: p.daysPerWeek,
    days: days.length ? days : [emptyDay(1)],
  };
}

/** Flatten editor state into the API day payload (assigns order/superset fields). */
export function daysToPayload(days: BuilderDay[]): ProgramDayPayload[] {
  return days.map((day) => ({
    dayIndex: day.dayIndex,
    title: day.title.trim() || undefined,
    exercises: day.rows.flatMap((row, order) => {
      const isSuper = row.type === 'superset' && row.items.length > 1;
      if (!isSuper) {
        const it = row.items[0];
        if (!it) return [];
        return [{ exerciseId: it.exerciseId, sets: it.sets, reps: it.reps, notes: it.notes, order }];
      }
      return row.items.map((it, si) => ({
        exerciseId: it.exerciseId,
        sets: it.sets,
        reps: it.reps,
        notes: it.notes,
        order,
        supersetGroupId: row.uid,
        supersetOrder: si,
      }));
    }),
  }));
}

export function parseStat(v: string): number | undefined {
  const n = Number(v);
  return v.trim() && !Number.isNaN(n) ? n : undefined;
}
