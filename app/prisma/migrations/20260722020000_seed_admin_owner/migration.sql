-- Seed the platform-owner (ADMIN) account so it can sign in with phone + password
-- immediately on a fresh server, without first doing the OTP bootstrap.
--
-- Phone : +989356995806  (0935 699 5806)
-- Role  : ADMIN
-- Pass  : scrypt hash below (see src/server/utils/crypto.ts for the scheme:
--         scrypt$<saltHex>$<keyHex>, keylen 64, node defaults). The plaintext is
--         NOT stored here; change it later from the app if desired.
--
-- Idempotent: if this phone already has an account (e.g. it OTP-logged-in before
-- this migration deployed), it is promoted to ADMIN and its password (re)set,
-- keeping the existing row/id. Migrations run once, so a later self-service
-- password change is never clobbered by a re-deploy.
--
-- NB: also add +989356995806 to the ADMIN_PHONES env var so the login-time owner
-- detection recognizes it (keeps the ADMIN role sticky and enables owner checks).
INSERT INTO "User" ("id", "phone", "role", "locale", "passwordHash", "createdAt", "updatedAt")
VALUES (
  'usr_admin_owner_9356995806',
  '+989356995806',
  'ADMIN',
  'fa',
  'scrypt$6002121c928e96a5a54ccdc8c09b6d23$4d9465870cd4faa3a6faebb35855c635c37a18ee812b7b175b580ea41165efc17ef930a9b17474c1bd4d96bac95d6826733e8eb0d20fa71848353dcb18ffa0f5',
  NOW(),
  NOW()
)
ON CONFLICT ("phone") DO UPDATE SET
  "role" = 'ADMIN',
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = NOW();
