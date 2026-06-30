import { api } from './client';
import type { CoachRequest, CreateProgramRequestInput, ProgramRequestStatus } from './types';

export const requestsApi = {
  // student
  imageUploadUrl: (contentType: string) =>
    api.post<{ uploadUrl: string; key: string }>('/student/requests/image-upload-url', { contentType }),
  create: (input: CreateProgramRequestInput) => api.post<{ id: string }>('/student/requests', input),

  // coach
  listForCoach: () => api.get<CoachRequest[]>('/coach/requests'),
  setStatus: (id: string, status: ProgramRequestStatus) =>
    api.patch<CoachRequest>(`/coach/requests/${id}`, { status }),
};
