'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api/account';
import { ME_QUERY_KEY } from './use-auth';

/**
 * Enable the coach or student side of this account. The server refreshes the
 * session cookie, so we only need to re-read `me` for the new capability to
 * show up across the UI (role switcher, nav).
 */
export function useEnableRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: 'COACH' | 'STUDENT') => accountApi.enableRole(role),
    onSuccess: (user) => {
      qc.setQueryData(ME_QUERY_KEY, user);
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/** Permanently delete the account, then drop all cached data. */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => accountApi.remove(password),
    onSuccess: () => {
      qc.setQueryData(ME_QUERY_KEY, null);
      qc.clear();
    },
  });
}
