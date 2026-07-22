import { api } from './client';
import type { TierCode } from '@/lib/plans';
import type { AdminCoach, AdminOverview, AdminPayment } from './types';

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
  coaches: (search?: string) =>
    api.get<AdminCoach[]>(`/admin/coaches${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  payments: () => api.get<AdminPayment[]>('/admin/payments'),
  /** Set a coach's capability tier (FREE/ECONOMY/NORMAL/PRO). */
  setTier: (coachUserId: string, tier: TierCode) =>
    api.post<unknown>(`/admin/coaches/${coachUserId}/subscription`, { tier }),
};
