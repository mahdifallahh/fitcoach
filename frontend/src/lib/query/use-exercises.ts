'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  exercisesApi,
  type ExerciseInput,
  type ListExercisesParams,
} from '@/lib/api/exercises';

export const EXERCISES_KEY = ['coach', 'exercises'] as const;

export function useExercises(params: ListExercisesParams) {
  return useQuery({
    queryKey: [...EXERCISES_KEY, params],
    queryFn: () => exercisesApi.list(params),
    placeholderData: (prev) => prev, // keep results visible while typing in search
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExerciseInput) => exercisesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: EXERCISES_KEY }),
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExerciseInput> }) =>
      exercisesApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: EXERCISES_KEY }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exercisesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: EXERCISES_KEY }),
  });
}
