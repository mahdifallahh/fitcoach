# ADR 0004 — Read-only access after trial/subscription expiry

**Status:** Accepted

## Context
Every coach gets a 7-day free trial. After it ends without an active subscription, the brief asks us to
decide (and be explicit/consistent) whether the coach becomes **read-only** or is **fully blocked**.

## Decision
Coaches become **read-only** when they have no active subscription (trial or paid). They can still view
their profile, exercise library, students, and existing programs, but **cannot create or edit** them.

## Rationale
- **Data ownership & trust:** locking coaches out of their own historical work is hostile; read-only keeps
  their data visible while still creating a clear upgrade incentive.
- **Conversion:** seeing the panel (with a persistent "subscribe to edit" banner) converts better than a
  hard wall.
- **Student continuity:** students keep seeing already-published programs regardless of the coach's billing
  state.

## Mechanics
- `SubscriptionGuard` + `@RequiresActiveSubscription()` decorate **write** endpoints (categories,
  exercises, programs, profile mutations). When the coach's subscription is not `TRIALING`/`ACTIVE`, these
  return `403 SUBSCRIPTION_REQUIRED`. Read endpoints are unguarded.
- A repeatable **BullMQ** job flips `endsAt < now` subscriptions to `EXPIRED`, so gating is consistent even
  without a login event.
- The frontend reflects state with disabled actions + an upgrade banner (no silent failures).

## Consequences
- Exactly one rule governs all coach mutations; UI and API stay consistent.
- Reactivating a plan immediately restores write access (guard re-reads status).
