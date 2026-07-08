import { api } from './client';
import type { PublicCoach } from './types';

export const publicApi = {
  coach: (handle: string) => api.get<PublicCoach>(`/public/coaches/${encodeURIComponent(handle)}`),
};
