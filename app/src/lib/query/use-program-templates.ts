'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  programTemplatesApi,
  type AssignTemplatePayload,
  type CreateTemplatePayload,
  type UpdateTemplatePayload,
} from '@/lib/api/program-templates';
import type { PageParams } from '@/lib/api/types';
import { PROGRAMS_KEY } from './use-programs';

export const TEMPLATES_KEY = ['coach', 'program-templates'] as const;

export function useTemplates(search?: string, params: PageParams = {}) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, search ?? '', params],
    queryFn: () => programTemplatesApi.list(search, params),
    placeholderData: (prev) => prev,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, 'detail', id],
    queryFn: () => programTemplatesApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => programTemplatesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      programTemplatesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => programTemplatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignTemplatePayload }) =>
      programTemplatesApi.assign(id, payload),
    // A new program was created → refresh the programs list.
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRAMS_KEY }),
  });
}

/** Save an existing program into the coach's template library. */
export function useCreateTemplateFromProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, name }: { programId: string; name?: string }) =>
      programTemplatesApi.createFromProgram(programId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}
