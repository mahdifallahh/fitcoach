'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api/categories';
import { EXERCISES_KEY } from './use-exercises';

export const CATEGORIES_KEY = ['coach', 'categories'] as const;

export function useCategories() {
  return useQuery({ queryKey: CATEGORIES_KEY, queryFn: () => categoriesApi.list() });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => categoriesApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoriesApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      qc.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORIES_KEY });
      qc.invalidateQueries({ queryKey: EXERCISES_KEY });
    },
  });
}
