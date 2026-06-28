'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import type { CurrentUser } from '@/lib/api/types';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

/** Current session. `data === null`-ish / error => not authenticated. */
export function useMe() {
  return useQuery<CurrentUser>({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => authApi.me(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(ME_QUERY_KEY, null);
      qc.clear();
    },
  });
}
