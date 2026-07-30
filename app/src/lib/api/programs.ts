import { api } from './client';
import { pageQuery } from './query';
import type { PageParams, Paginated, ProgramDetail, ProgramListItem, ProgramStatus2 } from './types';

export interface ProgramExercisePayload {
  exerciseId: string;
  sets: number;
  reps: string;
  notes?: string;
  order: number;
  supersetGroupId?: string;
  supersetOrder?: number;
}

export interface ProgramDayPayload {
  dayIndex: number;
  title?: string;
  exercises: ProgramExercisePayload[];
}

export interface CreateProgramPayload {
  studentContact: string;
  name: string;
  daysPerWeek: number;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  status?: ProgramStatus2;
  days: ProgramDayPayload[];
  /** When set, the backend marks this ProgramRequest ACCEPTED on save. */
  requestId?: string;
}

export type UpdateProgramPayload = Partial<Omit<CreateProgramPayload, 'studentContact' | 'requestId'>>;

export const programsApi = {
  list: (params: PageParams = {}) =>
    api.get<Paginated<ProgramListItem>>(`/coach/programs${pageQuery(params)}`),
  get: (id: string) => api.get<ProgramDetail>(`/coach/programs/${id}`),
  create: (payload: CreateProgramPayload) => api.post<ProgramDetail>('/coach/programs', payload),
  update: (id: string, payload: UpdateProgramPayload) =>
    api.patch<ProgramDetail>(`/coach/programs/${id}`, payload),
  setStatus: (id: string, status: ProgramStatus2) =>
    api.patch<ProgramDetail>(`/coach/programs/${id}/status`, { status }),
  remove: (id: string) => api.delete<{ success: boolean }>(`/coach/programs/${id}`),
  pdf: (id: string, locale: 'fa' | 'en') =>
    api.get<{ url: string; cached: boolean }>(`/coach/programs/${id}/pdf?locale=${locale}`),
  /**
   * Printable HTML for the same program — a plain href, not a fetch, because the
   * browser has to *navigate* to it for its print dialog to open. Used when the
   * server has no Chromium to render a real PDF with.
   */
  printHref: (id: string, locale: 'fa' | 'en') =>
    `/api/coach/programs/${id}/print?locale=${locale}`,
};
