import { api } from './client';
import type { StudentCoach, StudentProgramDetail, StudentProgramListItem } from './types';

export const studentApi = {
  coaches: () => api.get<StudentCoach[]>('/student/coaches'),
  coachPrograms: (coachId: string) =>
    api.get<StudentProgramListItem[]>(`/student/coaches/${coachId}/programs`),
  program: (id: string) => api.get<StudentProgramDetail>(`/student/programs/${id}`),
};
