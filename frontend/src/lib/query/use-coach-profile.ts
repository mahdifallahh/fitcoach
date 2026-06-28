'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coachProfileApi, type UpdateCoachProfileInput } from '@/lib/api/coach-profile';
import { ME_QUERY_KEY } from './use-auth';

export const COACH_PROFILE_KEY = ['coach', 'profile'] as const;

export function useCoachProfile() {
  return useQuery({ queryKey: COACH_PROFILE_KEY, queryFn: () => coachProfileApi.get() });
}

export function useUpdateCoachProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCoachProfileInput) => coachProfileApi.update(input),
    onSuccess: (data) => {
      qc.setQueryData(COACH_PROFILE_KEY, data);
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY }); // header avatar/name
    },
  });
}
