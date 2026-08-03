import { z } from "zod";
import { externalUrl } from "../utils/url";

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  categoryId: z.string().nullable().optional(),
  defaultSets: z.number().int().min(1).max(50).optional(),
  defaultReps: z.string().max(40).optional(),
  description: z.string().max(2000).nullable().optional(),
  gifUrl: z.string().max(500).nullable().optional(),
  // Reaches an <a href> in the student's viewer and in the PDF — see externalUrl.
  // Uploaded clips already arrive as absolute https URLs, so this only ever
  // rewrites a pasted link like "youtu.be/abc".
  videoUrl: externalUrl().nullable().optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

export type CreateExerciseDto = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseDto = z.infer<typeof updateExerciseSchema>;

export interface ListExercisesQueryDto {
  search?: string;
  categoryId?: string;
  /** Paging window; omitted values fall back to the shared defaults. */
  page?: string | number | null;
  pageSize?: string | number | null;
}
