/**
 * Gateways a coach may actually check out with, today.
 *
 * The Prisma `PaymentGateway` enum still contains STRIPE because historical
 * `Payment` rows reference it — but Stripe is not offered for new checkouts, so
 * it is deliberately excluded here. Re-enable by adding 'STRIPE' back to this
 * tuple (the provider, webhook handler and pricing all still exist).
 */
export const SubscriptionGateway = ['ZARINPAL'] as const;

export type SubscriptionGateway = (typeof SubscriptionGateway)[number];
