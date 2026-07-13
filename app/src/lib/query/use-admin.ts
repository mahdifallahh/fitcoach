'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export const ADMIN_OVERVIEW_KEY = ['admin', 'overview'] as const;
export const ADMIN_COACHES_KEY = ['admin', 'coaches'] as const;

export function useAdminOverview() {
  return useQuery({ queryKey: ADMIN_OVERVIEW_KEY, queryFn: () => adminApi.overview() });
}

export function useAdminCoaches(search?: string) {
  return useQuery({
    queryKey: [...ADMIN_COACHES_KEY, search ?? ''],
    queryFn: () => adminApi.coaches(search),
  });
}

export function useAdminPayments() {
  return useQuery({ queryKey: ['admin', 'payments'], queryFn: () => adminApi.payments() });
}

export function useAdminSubscriptionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { coachUserId: string; action: 'grant' | 'expire'; days?: number }) =>
      vars.action === 'grant'
        ? adminApi.grantSubscription(vars.coachUserId, vars.days ?? 30)
        : adminApi.expireSubscription(vars.coachUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COACHES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY });
    },
  });
}
