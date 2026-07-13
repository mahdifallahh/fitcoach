import { z } from "zod";

export const categoryNameSchema = z.object({
  name: z.string().min(1).max(60),
});
export type CategoryNameDto = z.infer<typeof categoryNameSchema>;
