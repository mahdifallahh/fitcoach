'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  programsApi,
  type CreateProgramPayload,
  type UpdateProgramPayload,
} from '@/lib/api/programs';
import type { ProgramStatus2 } from '@/lib/api/types';

export const PROGRAMS_KEY = ['coach', 'programs'] as const;

export function usePrograms() {
  return useQuery({ queryKey: PROGRAMS_KEY, queryFn: () => programsApi.list() });
}

export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: [...PROGRAMS_KEY, id],
    queryFn: () => programsApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProgramPayload) => programsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRAMS_KEY }),
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProgramPayload }) =>
      programsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRAMS_KEY }),
  });
}

export function useSetProgramStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProgramStatus2 }) =>
      programsApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRAMS_KEY }),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => programsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRAMS_KEY }),
  });
}
