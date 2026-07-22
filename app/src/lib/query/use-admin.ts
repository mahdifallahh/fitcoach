'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { TierCode } from '@/lib/plans';

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

export function useAdminSetTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { coachUserId: string; tier: TierCode }) =>
      adminApi.setTier(vars.coachUserId, vars.tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COACHES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_OVERVIEW_KEY });
    },
  });
}
