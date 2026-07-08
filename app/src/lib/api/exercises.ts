import { api } from './client';
import type { Exercise, UploadTarget } from './types';

export interface ExerciseInput {
  name: string;
  categoryId?: string | null;
  defaultSets?: number;
  defaultReps?: string;
  description?: string | null;
  gifUrl?: string | null;
}

export interface ListExercisesParams {
  search?: string;
  categoryId?: string;
}

function toQuery(params: ListExercisesParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.categoryId) sp.set('categoryId', params.categoryId);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const exercisesApi = {
  list: (params: ListExercisesParams = {}) => api.get<Exercise[]>(`/coach/exercises${toQuery(params)}`),
  create: (input: ExerciseInput) => api.post<Exercise>('/coach/exercises', input),
  update: (id: string, input: Partial<ExerciseInput>) => api.patch<Exercise>(`/coach/exercises/${id}`, input),
  remove: (id: string) => api.delete<{ success: boolean }>(`/coach/exercises/${id}`),
  gifUploadUrl: (contentType: string) =>
    api.post<UploadTarget>('/coach/exercises/gif-upload-url', { contentType }),
};
