import { api } from './client';
import type { CoachStudentDetail, CoachStudentListItem } from './types';

/** The coach's own view of the people they train (not the student-side API). */
export const coachStudentsApi = {
  list: () => api.get<CoachStudentListItem[]>('/coach/students'),
  get: (id: string) => api.get<CoachStudentDetail>(`/coach/students/${id}`),
};
