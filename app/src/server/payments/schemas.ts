import { z } from "zod";
import { SubscriptionGateway } from "./gateways";
import { SubscriptionPlan } from "@prisma/client";

export const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  // Only ZarinPal is offered today — Stripe is disabled (see ./gateways).
  gateway: z.enum(SubscriptionGateway),
  locale: z.enum(["fa", "en"]).optional(),
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;
