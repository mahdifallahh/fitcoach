'use client';

import { useQuery } from '@tanstack/react-query';
import { coachStudentsApi } from '@/lib/api/students';

export const COACH_STUDENTS_KEY = ['coach', 'students'] as const;

export function useCoachStudents() {
  return useQuery({
    queryKey: COACH_STUDENTS_KEY,
    queryFn: () => coachStudentsApi.list(),
  });
}

export function useCoachStudent(id: string | undefined) {
  return useQuery({
    queryKey: [...COACH_STUDENTS_KEY, 'detail', id],
    queryFn: () => coachStudentsApi.get(id as string),
    enabled: !!id,
  });
}
