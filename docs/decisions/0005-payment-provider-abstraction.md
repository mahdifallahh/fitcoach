# ADR 0005 — Payment provider abstraction (ZarinPal + Stripe)

**Status:** Accepted

## Context
Coaches pay in **IRR via ZarinPal** (domestic) or in **USD/other via Stripe** (international). Both must
drive the **same** subscription activation flow.

## Decision
Define a single `PaymentProvider` interface; implement `ZarinpalProvider` and `StripeProvider`; a
`PaymentsService` selects the provider, persists a `Payment`, and on confirmed success calls
`SubscriptionsService.activateOrExtend(coach, plan)`.

```ts
interface PaymentProvider {
  readonly gateway: 'ZARINPAL' | 'STRIPE';
  createCheckout(input: CheckoutInput): Promise<{ redirectUrl: string; reference: string }>;
  verify(payload: VerifyPayload): Promise<{ paid: boolean; reference: string; raw: unknown }>;
}
```

## Rationale
- New gateways plug in without touching subscription logic.
- Currency → gateway mapping lives in one place (`IRR → ZarinPal`, else `Stripe`), with explicit user choice
  allowed.
- Confirmation differs per gateway but converges: **ZarinPal** uses a redirect + server-side verify
  callback; **Stripe** uses Checkout + a signed **webhook** (raw-body signature verification).

## Mechanics
- `Payment` rows are created `PENDING`, updated to `PAID/FAILED` on confirmation; activation is **idempotent**
  keyed on the gateway reference (re-delivered webhooks/verifies don't double-extend).
- Stripe webhook route uses the raw request body for signature verification (configured in `main.ts`).

## Consequences
- Plans/prices are defined once and shared by both providers (amounts converted per currency).
- Testing targets the abstraction: a fake provider exercises the activation path deterministically.
