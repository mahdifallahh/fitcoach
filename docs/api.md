# API Overview

Base URL: same-origin `http://localhost:3000/api` (the app serves the UI and the API from one process — no
separate backend, no CORS). There is no interactive docs generator (Swagger was dropped with NestJS).

**The authoritative, up-to-date endpoint list is [`contextProject.md` §8](./contextProject.md#8-api-surface-all-under-api-same-origin).**
This file only covers the conventions that apply across every endpoint.

All responses use the envelope:
```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "error": { "code": "STRING_CODE", "message": "...", "details": { } } }
```

Auth uses **httpOnly cookies** (`access_token` path `/`, `refresh_token` path `/api/auth`). Clients send
credentials with each request (`credentials: 'include'`); no Authorization header juggling in the browser.
`lib/api/client.ts` transparently retries once with a refreshed access token on a 401.

Write endpoints under `/coach/*` (categories, exercises, programs) require an **active subscription** — a
coach-activated one-time 15-day free trial, or a paid plan. When there is none (never activated, or expired)
they return **402** `SUBSCRIPTION_REQUIRED` — read endpoints remain available.
