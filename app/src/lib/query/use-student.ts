'use client';

import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/lib/api/student';

export function useStudentCoaches() {
  return useQuery({ queryKey: ['student', 'coaches'], queryFn: () => studentApi.coaches() });
}

export function useCoachPrograms(coachId: string | undefined) {
  return useQuery({
    queryKey: ['student', 'coach-programs', coachId],
    queryFn: () => studentApi.coachPrograms(coachId as string),
    enabled: !!coachId,
  });
}

export function useStudentProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['student', 'program', id],
    queryFn: () => studentApi.program(id as string),
    enabled: !!id,
  });
}
