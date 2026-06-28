'use client';

import { useReducer } from 'react';
import {
  type BuilderDay,
  type BuilderItem,
  type BuilderRow,
  type BuilderState,
  emptyDay,
} from './types';

type Action =
  | { type: 'LOAD'; state: BuilderState }
  | { type: 'SET_META'; field: keyof BuilderState['meta']; value: string }
  | { type: 'SET_DAYS_PER_WEEK'; n: number }
  | { type: 'SET_DAY_TITLE'; dayUid: string; title: string }
  | { type: 'ADD_ROW'; dayUid: string; item: BuilderItem }
  | { type: 'ADD_TO_SUPERSET'; dayUid: string; rowUid: string; item: BuilderItem }
  | { type: 'MAKE_SUPERSET'; dayUid: string; rowUid: string }
  | { type: 'REMOVE_ROW'; dayUid: string; rowUid: string }
  | { type: 'REMOVE_ITEM'; dayUid: string; rowUid: string; itemUid: string }
  | { type: 'UPDATE_ITEM'; dayUid: string; rowUid: string; itemUid: string; patch: Partial<BuilderItem> }
  | { type: 'REORDER_ROWS'; dayUid: string; rows: BuilderRow[] };

function mapDay(state: BuilderState, dayUid: string, fn: (d: BuilderDay) => BuilderDay): BuilderState {
  return { ...state, days: state.days.map((d) => (d.uid === dayUid ? fn(d) : d)) };
}
function mapRow(day: BuilderDay, rowUid: string, fn: (r: BuilderRow) => BuilderRow): BuilderDay {
  return { ...day, rows: day.rows.map((r) => (r.uid === rowUid ? fn(r) : r)) };
}

function reducer(state: BuilderState, action: Action): BuilderState {
  switch (action.type) {
    case 'LOAD':
      return action.state;

    case 'SET_META':
      return { ...state, meta: { ...state.meta, [action.field]: action.value } };

    case 'SET_DAYS_PER_WEEK': {
      const n = Math.max(1, Math.min(14, action.n || 1));
      const days = [...state.days];
      if (n > days.length) {
        for (let i = days.length; i < n; i++) days.push(emptyDay(i + 1));
      } else {
        days.length = n;
      }
      return { ...state, daysPerWeek: n, days: days.map((d, i) => ({ ...d, dayIndex: i + 1 })) };
    }

    case 'SET_DAY_TITLE':
      return mapDay(state, action.dayUid, (d) => ({ ...d, title: action.title }));

    case 'ADD_ROW':
      return mapDay(state, action.dayUid, (d) => ({
        ...d,
        rows: [...d.rows, { uid: action.item.uid, type: 'single', items: [action.item] }],
      }));

    case 'MAKE_SUPERSET':
      return mapDay(state, action.dayUid, (d) =>
        mapRow(d, action.rowUid, (r) => ({ ...r, type: 'superset' })),
      );

    case 'ADD_TO_SUPERSET':
      return mapDay(state, action.dayUid, (d) =>
        mapRow(d, action.rowUid, (r) => ({ ...r, type: 'superset', items: [...r.items, action.item] })),
      );

    case 'REMOVE_ROW':
      return mapDay(state, action.dayUid, (d) => ({ ...d, rows: d.rows.filter((r) => r.uid !== action.rowUid) }));

    case 'REMOVE_ITEM':
      return mapDay(state, action.dayUid, (d) => ({
        ...d,
        rows: d.rows
          .map((r) => {
            if (r.uid !== action.rowUid) return r;
            const items = r.items.filter((it) => it.uid !== action.itemUid);
            return { ...r, items, type: items.length > 1 ? 'superset' : 'single' } as BuilderRow;
          })
          .filter((r) => r.items.length > 0),
      }));

    case 'UPDATE_ITEM':
      return mapDay(state, action.dayUid, (d) =>
        mapRow(d, action.rowUid, (r) => ({
          ...r,
          items: r.items.map((it) => (it.uid === action.itemUid ? { ...it, ...action.patch } : it)),
        })),
      );

    case 'REORDER_ROWS':
      return mapDay(state, action.dayUid, (d) => ({ ...d, rows: action.rows }));

    default:
      return state;
  }
}

export function useProgramDraft(initial: BuilderState) {
  const [state, dispatch] = useReducer(reducer, initial);
  return {
    state,
    load: (s: BuilderState) => dispatch({ type: 'LOAD', state: s }),
    setMeta: (field: keyof BuilderState['meta'], value: string) => dispatch({ type: 'SET_META', field, value }),
    setDaysPerWeek: (n: number) => dispatch({ type: 'SET_DAYS_PER_WEEK', n }),
    setDayTitle: (dayUid: string, title: string) => dispatch({ type: 'SET_DAY_TITLE', dayUid, title }),
    addRow: (dayUid: string, item: BuilderItem) => dispatch({ type: 'ADD_ROW', dayUid, item }),
    addToSuperset: (dayUid: string, rowUid: string, item: BuilderItem) =>
      dispatch({ type: 'ADD_TO_SUPERSET', dayUid, rowUid, item }),
    makeSuperset: (dayUid: string, rowUid: string) => dispatch({ type: 'MAKE_SUPERSET', dayUid, rowUid }),
    removeRow: (dayUid: string, rowUid: string) => dispatch({ type: 'REMOVE_ROW', dayUid, rowUid }),
    removeItem: (dayUid: string, rowUid: string, itemUid: string) =>
      dispatch({ type: 'REMOVE_ITEM', dayUid, rowUid, itemUid }),
    updateItem: (dayUid: string, rowUid: string, itemUid: string, patch: Partial<BuilderItem>) =>
      dispatch({ type: 'UPDATE_ITEM', dayUid, rowUid, itemUid, patch }),
    reorderRows: (dayUid: string, rows: BuilderRow[]) => dispatch({ type: 'REORDER_ROWS', dayUid, rows }),
  };
}

export type ProgramDraft = ReturnType<typeof useProgramDraft>;
