import { api } from './client';
import type { Category } from './types';

export const categoriesApi = {
  list: () => api.get<Category[]>('/coach/categories'),
  create: (name: string) => api.post<Category>('/coach/categories', { name }),
  rename: (id: string, name: string) => api.patch<Category>(`/coach/categories/${id}`, { name }),
  remove: (id: string) => api.delete<{ success: boolean }>(`/coach/categories/${id}`),
};
