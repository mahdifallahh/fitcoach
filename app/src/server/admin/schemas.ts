import { z } from "zod";

/** Grant N days of access, or expire the coach's subscription immediately. */
export const subscriptionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), days: z.number().int().min(1).max(3650) }),
  z.object({ action: z.literal("expire") }),
]);

export type SubscriptionActionDto = z.infer<typeof subscriptionActionSchema>;
