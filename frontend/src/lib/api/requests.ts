import { api } from './client';
import type { CoachRequest, CreateProgramRequestInput, ProgramRequestStatus, StudentRequest } from './types';

export const requestsApi = {
  // student
  imageUploadUrl: (contentType: string) =>
    api.post<{ uploadUrl: string; key: string }>('/student/requests/image-upload-url', { contentType }),
  create: (input: CreateProgramRequestInput) => api.post<{ id: string }>('/student/requests', input),
  mine: () => api.get<StudentRequest[]>('/student/requests'),

  // coach
  listForCoach: () => api.get<CoachRequest[]>('/coach/requests'),
  setStatus: (id: string, status: ProgramRequestStatus, declineReason?: string) =>
    api.patch<CoachRequest>(`/coach/requests/${id}`, { status, declineReason }),
};
