# API Overview

Base URL: `http://localhost:4000/api`. Interactive reference (always current): **Swagger at `/api/docs`**.

All responses use the envelope:
```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "error": { "code": "STRING_CODE", "message": "...", "details": { } } }
```

Auth uses **httpOnly cookies** (`access_token`, `refresh_token`). Clients send credentials with each request;
no Authorization header juggling on the browser.

## Surface (high level)

| Area | Method & path | Notes |
| --- | --- | --- |
| Health | `GET /health` | DB/Redis/S3 readiness |
| Auth | `POST /auth/otp/request` | body: `{ identifier, channel }` → sends code |
| | `POST /auth/otp/verify` | body: `{ identifier, code, role? }` → sets cookies |
| | `POST /auth/magic-link/request` | email magic link |
| | `GET /auth/magic-link/consume` | `?token=` → sets cookies |
| | `POST /auth/refresh` | rotates refresh, issues new access |
| | `POST /auth/logout` | revokes refresh, clears cookies |
| | `GET /auth/me` | current user + profile |
| Coach profile | `GET/PUT /coach/profile` | bio, avatar, social links, tags |
| Categories | `GET/POST /coach/categories`, `PATCH/DELETE /coach/categories/:id` | per-coach |
| Exercises | `GET/POST /coach/exercises`, `PATCH/DELETE /coach/exercises/:id` | search + category filter |
| Uploads | `POST /storage/presign` | presigned PUT URL for gifs/avatars |
| Programs | `GET/POST /coach/programs`, `GET/PATCH/DELETE /coach/programs/:id` | nested days/exercises/supersets |
| | `POST /coach/programs/:id/publish` | draft → published |
| | `GET /coach/programs/:id/pdf` | cached PDF (regenerates if stale) |
| Students (coach view) | `GET/POST /coach/students` | create-by-phone/email |
| Student panel | `GET /student/coaches` | coaches who authored programs for me |
| | `GET /student/coaches/:coachId/programs` | their programs for me |
| | `GET /student/programs/:id` | program viewer payload |
| Subscriptions | `GET /coach/subscription` | current status |
| | `GET /coach/plans` | plans + pricing |
| Payments | `POST /payments/checkout` | `{ plan, gateway }` → redirect/checkout URL |
| | `GET /payments/zarinpal/verify` | ZarinPal callback |
| | `POST /payments/stripe/webhook` | Stripe webhook (raw body) |
| | `GET /coach/payments` | payment history |

> Write endpoints under `/coach/*` (categories, exercises, programs) require an **active subscription**
> (trial or paid). When expired they return `403 SUBSCRIPTION_REQUIRED` — read endpoints remain available.

Detailed request/response schemas, examples, and try-it-out live in Swagger.
