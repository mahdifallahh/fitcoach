# ADR 0002 — Passwordless authentication (OTP + magic-link)

**Status:** Accepted

## Context
Users sign in with **phone or email**. The brief requires OTP for phone and "password or magic-link/OTP"
for email, with a **pluggable** SMS provider (mock in dev, real vendor via env in prod).

## Decision
Go **fully passwordless**:
- **Phone** → SMS one-time code (OTP).
- **Email** → emailed one-time code **or** magic link.
- No passwords stored or required (a nullable `passwordHash` column is reserved for a possible future
  password option but is unused).

## Rationale
- Removes password storage/reset complexity and a whole category of credential-stuffing risk.
- Consistent UX across both identifiers; the same verification primitive (one-time secret) backs both.
- Matches Iranian market norms (phone-first, OTP-driven).

## Mechanics
- OTP codes and magic-link tokens are stored **hashed** with short TTL; verification is constant-time.
- `ThrottlerModule` rate-limits request/verify; attempts are tracked per token.
- On success the backend issues a short-lived **access JWT** and a rotating **refresh JWT**, both as
  **httpOnly cookies** (mitigates XSS token theft).
- SMS and Email are behind `SmsProvider` / `EmailProvider` interfaces; `SMS_PROVIDER`/`EMAIL_PROVIDER=mock`
  logs codes/links to the console for dev.

## Consequences
- A working SMS/email provider is required in production (mock only for dev/test).
- Account recovery == the same OTP flow (no separate reset path needed).
