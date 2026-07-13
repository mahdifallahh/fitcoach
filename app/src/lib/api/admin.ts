import { api } from './client';
import type { AdminCoach, AdminOverview, AdminPayment } from './types';

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
  coaches: (search?: string) =>
    api.get<AdminCoach[]>(`/admin/coaches${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  payments: () => api.get<AdminPayment[]>('/admin/payments'),
  grantSubscription: (coachUserId: string, days: number) =>
    api.post<unknown>(`/admin/coaches/${coachUserId}/subscription`, { action: 'grant', days }),
  expireSubscription: (coachUserId: string) =>
    api.post<unknown>(`/admin/coaches/${coachUserId}/subscription`, { action: 'expire' }),
};
