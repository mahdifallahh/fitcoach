# Architecture

## System overview

```
┌──────────────┐        HTTPS/JSON         ┌──────────────────────────┐
│  Next.js PWA │  ───────────────────────▶ │        NestJS API        │
│  (frontend)  │  ◀───────────────────────  │        (backend)         │
└──────────────┘   httpOnly JWT cookies     └────────────┬─────────────┘
                                                          │
                        ┌─────────────────────────────────┼───────────────────────────┐
                        ▼                                  ▼                           ▼
                 ┌────────────┐                     ┌────────────┐              ┌──────────────┐
                 │ PostgreSQL │                     │   Redis    │              │ S3 / MinIO   │
                 │  (Prisma)  │                     │ cache+queue│              │ gifs/avatars │
                 └────────────┘                     └─────┬──────┘              │     pdfs     │
                                                          │ BullMQ              └──────────────┘
                                                          ▼
                                            ┌──────────────────────────┐
                                            │ Workers: subscription     │
                                            │ expiry sweep, PDF regen   │
                                            └──────────────────────────┘

       External: ZarinPal (IRR) · Stripe (intl) · SMS provider · Email/SMTP provider
```

## Backend (NestJS) — module map

Feature-module-per-domain. Each module owns its controller, service, DTOs, and (where useful) a repository
wrapper over Prisma.

| Module | Responsibility |
| --- | --- |
| `config` | Schema-validated env (`ConfigModule`), typed accessors |
| `common` | Global exception filter, response interceptor, guards, decorators, pipes |
| `prisma` | `PrismaService` (Nest lifecycle wrapper around the Prisma client) |
| `health` | Liveness/readiness endpoints (DB/Redis/S3 checks) |
| `auth` | Passwordless OTP + magic-link, JWT access/refresh, role & subscription guards |
| `users` | User records, role assignment |
| `coach-profile` | Coach profile (bio, avatar, social links, tags) |
| `students` | StudentProfile CRUD + **claim/linking** on registration |
| `categories` | Per-coach exercise categories |
| `exercises` | Per-coach exercise library (+ GIF upload) |
| `programs` | Programs → days → exercises → superset groups (transactional) |
| `subscriptions` | Trial creation, plan activation/extension, expiry, write-gating |
| `payments` | `PaymentProvider` abstraction (ZarinPal + Stripe), checkout + verify/webhook |
| `storage` | S3/MinIO abstraction (put, presign, delete) |
| `notifications` | Pluggable SMS + Email providers (mock in dev) |
| `pdf` | Puppeteer HTML→PDF render + cache |

### Cross-cutting conventions
- **Response envelope:** every success returns `{ success: true, data }`; every error returns
  `{ success: false, error: { code, message, details? } }` (global exception filter + interceptor).
- **Validation:** global `ValidationPipe` with `whitelist` + `transform`; DTOs use `class-validator`.
- **AuthZ:** `JwtAuthGuard` (cookie-based) → `RolesGuard` (`@Roles()`) → `SubscriptionGuard`
  (`@RequiresActiveSubscription()` on coach write endpoints).
- **Rate limiting:** `ThrottlerModule` on OTP request/verify.
- **Docs:** Swagger at `/api/docs`.

## Frontend (Next.js App Router) — layers

```
app/[locale]/        Route segments (locale-aware). (auth)/, coach/, student/.
components/ui/        shadcn/ui primitives (themeable, accessible)
components/shared/    App-level shared widgets (Navbar, ThemeToggle, LocaleSwitcher, ...)
components/coach/     Coach-panel components (program builder, exercise picker, ...)
components/student/   Student-panel components (program viewer, coach list, ...)
lib/api/              Typed API client + per-resource request functions
lib/query/            TanStack Query client + hooks (server-state only)
lib/                  auth helpers, utils, zod schemas
messages/             fa.json / en.json (all UI strings — no hardcoded text)
i18n/                 next-intl routing + request config
```

- **Separation:** presentation components never call `fetch` directly — they consume TanStack Query hooks
  that wrap the typed API client in `lib/api`.
- **Forms:** React Hook Form + Zod resolvers; Zod schemas colocated and reused for validation messaging.
- **Theming:** `next-themes` + CSS variables (blue/white brand, light/dark). Direction & font driven by locale.

## Key data flows

- **Passwordless login:** request OTP → backend stores hashed code (Redis TTL + DB audit) → user submits
  code → backend verifies, issues access (short) + refresh (rotating) JWTs as httpOnly cookies.
- **Student linking:** coach creates `StudentProfile` keyed by normalized phone/email (`userId = null`) →
  student registers → transactional claim back-fills `userId` on all matching profiles → student sees all
  coaches/programs.
- **PDF:** program save marks `pdfStaleAt` → BullMQ job renders HTML via Puppeteer → uploads to S3 →
  stores `pdfUrl`. Download endpoint returns cached URL or regenerates on demand.
- **Subscription gating:** repeatable BullMQ sweep flips expired subscriptions to `EXPIRED`;
  `SubscriptionGuard` blocks coach write endpoints → effectively read-only until renewal.
