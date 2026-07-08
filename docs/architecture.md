# Architecture

## System overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Next.js app  (app/, one process)                  │
│                                                                         │
│   Browser ── HTTPS/JSON ──▶  UI (App Router, app/src/app/[locale])    │
│           ◀── httpOnly JWT cookies ──                                  │
│                                        │ same-origin fetch             │
│                                        ▼                                │
│                          API Route Handlers (app/src/app/api/**)      │
│                                        │                                │
│                                        ▼                                │
│                     Server layer (app/src/server/<feature>/service.ts)│
└───────────────┬──────────────────────────┬────────────────┬──────────┘
                 ▼                           ▼                ▼
          ┌────────────┐              ┌────────────┐   ┌──────────────┐
          │ PostgreSQL │              │ S3 / MinIO │   │  node-cron   │
          │  (Prisma)  │              │gifs/avatars│   │  in-process  │
          └────────────┘              │    pdfs    │   │(expiry sweep)│
                                       │  requests  │   └──────────────┘
                                       └────────────┘

     External: ZarinPal (IRR) · Stripe (intl) · SMS provider · Puppeteer/Chromium (PDF)
```

No Redis, no queue, no second app. UI and API share one Node process (`docker compose up` → one `app`
container, plus `postgres` + `minio`).

## Server layer — feature map (`app/src/server`)

Each feature owns a `service.ts` (plain class, constructor-injected deps) and usually a `schemas.ts` (Zod
DTOs). Wired once as lazy singletons in `container.ts`; route handlers call the getter and never construct
services directly.

| Feature | Responsibility |
| --- | --- |
| `config` | Zod-validated env, lazy (`getConfig()`), typed `AppConfig.get(key)` |
| `http` | `errors.ts` (AppError shims), `envelope.ts` (response shaping), `route.ts` (`withRoute` guard chain), `rate-limit.ts` |
| `auth` | Phone OTP, JWT access/refresh (`jose`), session cookies |
| `users` | User creation — coach starter profile (no subscription yet) / student claim-by-identifier |
| `coach-profile` | Coach profile (bio, avatar, social links, tags, card/price) |
| `students` | StudentProfile CRUD + **claim/linking** on registration |
| `categories` | Per-coach exercise categories |
| `exercises` | Per-coach exercise library (+ GIF/video upload) |
| `programs` | Programs → days → exercises → superset groups (transactional) |
| `program-requests` | Public-page intake requests, coach inbox, accept-on-save / decline-with-reason |
| `public-coach` | Public `/c/<handle>` page payload |
| `subscriptions` | Coach-initiated one-time free trial (`activateTrial`), plan activation/extension, hourly expiry sweep |
| `payments` | `PaymentProvider` abstraction (ZarinPal + Stripe), checkout + verify/webhook |
| `storage` | S3/MinIO abstraction (put, presign, delete) — two clients (internal ops vs. public presigning) |
| `notifications` | Pluggable SMS + Email providers (mock in dev) |
| `pdf` | Puppeteer HTML→PDF render + cache on `Program.pdfUrl` |

### Cross-cutting conventions
- **Response envelope:** every success returns `{ success: true, data }`; every error returns
  `{ success: false, error: { code, message, details? } }` (`http/envelope.ts`).
- **Validation:** Zod schemas passed as `bodySchema` to `withRoute`; parsed before the handler runs.
- **AuthZ:** `withRoute({ role?, requiresSub? })` — no global guards; each route opts in. `requiresSub: true`
  → 402 `SUBSCRIPTION_REQUIRED` when the coach has no active subscription (including "never activated the
  trial" — there's no auto-created trial anymore).
- **Rate limiting:** in-memory fixed-window limiter (`http/rate-limit.ts`) on OTP request/verify.
- No API docs generator (Swagger was dropped with NestJS).

## UI layer — App Router (`app/src`)

```
app/[locale]/         Route segments (locale-aware). (auth)/, coach/, student/, c/[handle]/.
app/api/**/route.ts   One folder per endpoint, mirrors the server feature map above.
components/ui/        shadcn/ui primitives (themeable, accessible)
components/shared/    App-level shared widgets (dashboard-shell, theme-toggle, locale-switcher, gif-lightbox)
components/coach/     Coach-panel components (program builder, exercise picker, billing-view, ...)
components/student/   Student-panel components (program viewer, coach list, my-requests, ...)
lib/api/              Typed, same-origin API client + per-resource request functions
lib/query/            TanStack Query client + hooks (server-state only)
lib/                  utils, zod schemas
messages/             fa.json / en.json (all UI strings — no hardcoded text)
i18n/                 next-intl routing + request config
```

- **Separation:** presentation components never call `fetch` directly — they consume TanStack Query hooks
  that wrap the typed API client in `lib/api`.
- **Forms:** React Hook Form + Zod resolvers; Zod schemas colocated and reused for validation messaging.
- **Theming:** `next-themes` + CSS variables (blue/white brand, light/dark). Direction & font driven by locale.

## Key data flows

- **Passwordless login:** request OTP → server stores a hashed code (DB, 60s cooldown, TTL) → user submits
  the code → server verifies, issues access (short) + refresh (rotating) JWTs as httpOnly cookies. Dev-only:
  the code is echoed back as `devCode` and the login form auto-submits it.
- **Student linking:** coach creates a `StudentProfile` keyed by normalized phone/email (`userId = null`) →
  student registers → a transactional claim back-fills `userId` on all matching profiles → student sees all
  coaches/programs.
- **Trial / subscription gating:** a coach has **no subscription** at signup. From the billing page they
  activate a **one-time 15-day free trial** (blocked with 409 if they already have a subscription row, even
  an expired one). An hourly `node-cron` sweep flips expired trials/plans to `EXPIRED`; write endpoints then
  402 until the coach subscribes — reads stay open (read-only, not locked out).
- **PDF:** a program edit sets `pdfStaleAt` → the next PDF request renders HTML via Puppeteer → uploads to
  the `pdfs` bucket → caches `pdfUrl`. Missing Chromium degrades to a clean 503, never a crash.
