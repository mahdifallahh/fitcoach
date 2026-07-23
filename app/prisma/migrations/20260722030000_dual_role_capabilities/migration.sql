-- Dual-role capabilities: one phone can hold BOTH a coach side and a student
-- side. `User.role` stays as the primary/landing role (and the ADMIN marker),
-- while these flags become the source of truth for panel + API access.
ALTER TABLE "User"
  ADD COLUMN "isCoach"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isStudent" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from the existing single-role world so nobody loses access:
--   coach  = declared COACH, or already owns a CoachProfile
--   student = declared STUDENT, or already has a linked StudentProfile
-- ADMIN accounts intentionally get neither (they only use the owner panel).
UPDATE "User" u
SET "isCoach" = true
WHERE u."role" = 'COACH'
   OR EXISTS (SELECT 1 FROM "CoachProfile" cp WHERE cp."userId" = u."id");

UPDATE "User" u
SET "isStudent" = true
WHERE u."role" = 'STUDENT'
   OR EXISTS (SELECT 1 FROM "StudentProfile" sp WHERE sp."userId" = u."id");
