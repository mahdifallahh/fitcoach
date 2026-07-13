import { z } from "zod";
import { PaymentGateway, SubscriptionPlan } from "@prisma/client";

export const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
  gateway: z.nativeEnum(PaymentGateway),
  locale: z.enum(["fa", "en"]).optional(),
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;
