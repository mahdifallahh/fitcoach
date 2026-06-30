'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publicApi } from '@/lib/api/public';
import { requestsApi } from '@/lib/api/requests';
import type { ProgramRequestStatus } from '@/lib/api/types';

export const COACH_REQUESTS_KEY = ['coach', 'requests'] as const;

export function usePublicCoach(handle: string | undefined) {
  return useQuery({
    queryKey: ['public', 'coach', handle],
    queryFn: () => publicApi.coach(handle as string),
    enabled: !!handle,
    retry: false,
  });
}

export function useCoachRequests() {
  return useQuery({ queryKey: COACH_REQUESTS_KEY, queryFn: () => requestsApi.listForCoach() });
}

export function useSetRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProgramRequestStatus }) =>
      requestsApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: COACH_REQUESTS_KEY }),
  });
}
