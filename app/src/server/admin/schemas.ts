import { z } from "zod";
import { SubscriptionTier } from "@prisma/client";

/** Owner sets a coach's capability tier (student-quota based, not time-based). */
export const setTierSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
});

export type SetTierDto = z.infer<typeof setTierSchema>;
