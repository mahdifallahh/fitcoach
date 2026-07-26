import { api } from './client';
import type { PageParams, Paginated } from './types';
import type { ProgramDayPayload } from './programs';
import type {
  ProgramDetail,
  ProgramStatus2,
  ProgramTemplateDetail,
  ProgramTemplateListItem,
} from './types';

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  daysPerWeek: number;
  days: ProgramDayPayload[];
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string | null; // null clears it
  daysPerWeek?: number;
  days?: ProgramDayPayload[];
}

export interface AssignTemplatePayload {
  studentContact: string;
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  status?: ProgramStatus2;
  /** When set, the backend marks this ProgramRequest ACCEPTED on assign. */
  requestId?: string;
}

const qs = (search: string | undefined, params: PageParams) => {
  const sp = new URLSearchParams();
  if (search && search.trim()) sp.set('search', search.trim());
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const programTemplatesApi = {
  list: (search?: string, params: PageParams = {}) =>
    api.get<Paginated<ProgramTemplateListItem>>(`/coach/program-templates${qs(search, params)}`),
  get: (id: string) => api.get<ProgramTemplateDetail>(`/coach/program-templates/${id}`),
  create: (payload: CreateTemplatePayload) =>
    api.post<ProgramTemplateDetail>('/coach/program-templates', payload),
  update: (id: string, payload: UpdateTemplatePayload) =>
    api.patch<ProgramTemplateDetail>(`/coach/program-templates/${id}`, payload),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/coach/program-templates/${id}`),
  assign: (id: string, payload: AssignTemplatePayload) =>
    api.post<ProgramDetail>(`/coach/program-templates/${id}/assign`, payload),
};
