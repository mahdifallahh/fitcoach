import { z } from 'zod';

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  categoryId: z.string().nullable().optional(),
  defaultSets: z.number().int().min(1).max(50).optional(),
  defaultReps: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  gifUrl: z.string().max(500).nullable().optional(),
  videoUrl: z.string().max(500).nullable().optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

export type CreateExerciseDto = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseDto = z.infer<typeof updateExerciseSchema>;

export interface ListExercisesQueryDto {
  search?: string;
  categoryId?: string;
}
