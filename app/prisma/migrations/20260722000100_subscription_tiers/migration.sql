-- Move subscriptions from time-based (15-day trial, N-month plans) to
-- capability tiers scoped by student count. FREE is permanent (never expires);
-- endsAt becomes nullable for that. Every trial-origin coach (and any coach with
-- no subscription row) is migrated to a permanent FREE tier.

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'ECONOMY', 'NORMAL', 'PRO');

-- AlterTable: add tier (default FREE) and allow a null endsAt (never-expiring).
ALTER TABLE "Subscription" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Subscription" ALTER COLUMN "endsAt" DROP NOT NULL;

-- Convert every trial-origin subscription (no paid plan attached — i.e. the
-- 15-day free trials, whether still TRIALING or already EXPIRED) into a
-- permanent FREE tier: active, no end date. Real paid rows (plan IS NOT NULL)
-- are left untouched.
UPDATE "Subscription"
SET "tier" = 'FREE', "status" = 'ACTIVE', "endsAt" = NULL
WHERE "plan" IS NULL;

-- Backfill: any coach who never activated a subscription now gets a permanent
-- FREE row, so "every coach is at least Free" holds without null-row special
-- cases in the app layer.
INSERT INTO "Subscription" ("id", "coachId", "tier", "plan", "status", "startsAt", "createdAt", "updatedAt")
SELECT
  'sub_free_' || substr(md5(random()::text || clock_timestamp()::text || cp."userId"), 1, 20),
  cp."userId",
  'FREE',
  NULL,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "CoachProfile" cp
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s WHERE s."coachId" = cp."userId"
);
