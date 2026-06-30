# contextProject — single-file map of the whole project

> Purpose: read **this file** (and the rest of `docs/`) instead of scanning the entire codebase.
> It tells an agent what the project is, where every piece lives, the patterns to follow, the data
> shapes, the API surface, and the environment gotchas. Keep it updated when architecture changes.

---

## 1. What this is

**FitCoach** — a full-stack, mobile-first, **bilingual (fa-RTL default / en-LTR) PWA** where **coaches**
write training programs + manage an exercise library, and **students** view the programs written for them.
Monetization = coach-only subscriptions (7-day trial → 3M/6M/12M) via **ZarinPal (IRR)** or **Stripe (USD)**.

**Defining domain rule (the "linking rule"):** a coach can author a program against a student's
**phone/email before that student has an account**; when the student later registers, all prior programs
auto-link to them. Implemented via `StudentProfile.userId` being **nullable until claimed**.

**Status:** all 9 build phases implemented; see `docs/progress.md` for the per-phase checklist + caveats.

---

## 2. Tech stack

- **Backend:** NestJS 10 + TypeScript (strict), Prisma 5 ORM → PostgreSQL 16, Redis 7 (ioredis), BullMQ-free
  (uses `@nestjs/schedule` cron), `@aws-sdk/client-s3` → MinIO/S3, `stripe`, `puppeteer-core` (PDF, lazy).
- **Frontend:** Next.js 15 App Router + TS, Tailwind + shadcn/ui (Radix), Framer Motion, `sonner` toasts,
  `next-themes`, `next-intl` (locale routing), TanStack Query, React Hook Form + Zod, `@dnd-kit` (builder).
- **Infra:** Docker Compose (postgres, redis, minio, minio-init, backend, frontend). pnpm. Node 20.
- **Package manager:** pnpm (each app has its own `package.json` + lockfile).

---

## 3. Repo layout

```
d:/practice
├── docker-compose.yml         # full stack; host infra ports REMAPPED (see §9)
├── .env / .env.example        # root compose env (consumed by containers)
├── docs/                      # ← knowledge base (this file lives here)
├── backend/                   # NestJS API
│   ├── Dockerfile             # multi-stage; base installs chromium+fonts (best-effort apt)
│   ├── .env / .env.example    # backend env (host-dev values)
│   ├── prisma/{schema.prisma, migrations/0_init, seed.ts}
│   └── src/ … (see §4)
└── frontend/                  # Next.js app
    ├── Dockerfile             # multi-stage (standalone for prod)
    ├── next.config.ts         # next-intl plugin; standalone only when NEXT_OUTPUT=standalone
    └── src/ … (see §6)  + public/ (PWA assets)
```

---

## 4. Backend architecture (`backend/src`)

- **Entry:** `main.ts` — global `/api` prefix, `cookie-parser`, CORS (credentials, FRONTEND_ORIGIN),
  global `ValidationPipe` (whitelist+transform+forbidNonWhitelisted), Swagger at `/api/docs`,
  `rawBody: true` (for Stripe webhook). `app.module.ts` wires every module + the 4 global guards.
- **config/** `config.module.ts` (typed `AppConfigService.get(key)` + `isProduction`), `env.validation.ts`
  (zod schema — **single source of truth for env vars**; add new env here).
- **prisma/** `PrismaService` (extends PrismaClient, connects on init). Schema at `backend/prisma/schema.prisma`.
- **redis/** `RedisService` — `client`, `remember(key, ttl, factory)`, `invalidate(...keys)`, `invalidatePattern`.
- **common/**
  - `decorators/`: `@Public()`, `@Roles(...)`, `@CurrentUser()`, `@RequiresActiveSubscription()`.
  - `guards/`: `JwtAuthGuard` (reads access cookie), `RolesGuard`, `SubscriptionGuard` (402 when lapsed).
  - `filters/all-exceptions.filter.ts` + `interceptors/response.interceptor.ts` → **response envelope** (§5).
  - `utils/`: `identifier.util.ts` (normalize phone→E.164 / email→lowercase; **the linking key**),
    `crypto.util.ts` (OTP/token gen, sha256 hash, timing-safe compare).
  - `cache/cache-keys.ts` — centralized Redis key builders + TTLs.
- **modules/** (feature = folder: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto/`):
  `health, notifications, storage, users, auth, coach-profile, categories, exercises, students,
   programs, pdf, subscriptions, payments`.

### Global guard order (all `APP_GUARD` in `app.module.ts`)
`ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard` → `SubscriptionGuard`.
Every route is authed unless `@Public()`. `@Roles(COACH|STUDENT)` restricts. `@RequiresActiveSubscription()`
gates writes (reads stay open when a coach's trial/plan lapses → read-only).

### Cross-cutting conventions
- Controllers are thin; logic in services. Ownership always enforced in the service (`where: { id, coachId }`).
- Multi-table writes use `prisma.$transaction`. Errors thrown as Nest `HttpException` with
  `{ code, message, details? }` body so the envelope carries a stable machine `code`.

---

## 5. Response envelope (every endpoint)

```
success: { "success": true, "data": <payload> }
error:   { "success": false, "error": { "code": "STRING_CODE", "message": "...", "details"?: any } }
```
Frontend `lib/api/client.ts` unwraps `data` and throws `ApiError(status, error)` on failure.

---

## 6. Frontend architecture (`frontend/src`)

- **Routing:** `app/[locale]/...` (next-intl, `localePrefix: 'always'`, default `fa`). `i18n/routing.ts`
  exports locale-aware `Link, useRouter, usePathname, redirect`. **Always import nav from `@/i18n/routing`,
  not `next/link`/`next/navigation`** (except `useParams`/`useSearchParams`).
- **Pages:** `[locale]/page.tsx` (landing), `login`, `coach/{page,profile,exercises,programs/{page,new,[id]/edit},billing,requests}`,
  `student/{page,coaches/[coachId],programs/[id]}`, and **public** `c/[handle]` + `c/[handle]/request`
  (the public coach page + the auth-gated intake form).
- **layout.tsx:** sets `<html dir lang>` + per-locale font; renders `AppProviders` (next-intl + theme +
  React Query + Toaster) and `ServiceWorkerRegister`. Exports `metadata` (manifest/icons) + `viewport` (themeColor).
- **components/**
  - `ui/` shadcn primitives (button, card, input, label, textarea, select[native], dialog, badge, skeleton).
  - `shared/` `dashboard-shell` (header: logo + locale + theme + logout), `locale-switcher`, `theme-toggle`.
  - `auth/` `auth-form` (2-step OTP), `auth-guard` (client role gate), `logout-button`.
  - `coach/` `coach-page-layout` (AuthGuard COACH + shell + nav + SubscriptionBanner), `coach-nav`,
    `profile-form`, `category-manager`, `exercise-form-dialog`, `exercise-library`, `program-list`,
    `billing-view`, `subscription-banner`, `download-pdf-button`, **`program-builder/`** (the centerpiece:
    `program-builder.tsx`, `use-program-draft.ts` (reducer), `types.ts` (serialize/reconstruct ↔ API),
    `day-row.tsx` (sortable single/superset row), `exercise-picker.tsx`).
  - `student/` `student-page-layout`, `coaches-list`, `coach-programs`, `program-viewer` (calm viewer).
  - `providers/` app-providers, theme-provider, query-provider. `pwa/` service-worker-register.
- **lib/api/**: `client.ts` (fetch wrapper: `credentials:'include'`, envelope unwrap, **auto-refresh on 401**),
  per-feature modules (`auth, coach-profile, categories, exercises, programs, student, billing`), `upload.ts`
  (presigned-PUT helper), `types.ts` (all shared types).
- **lib/query/**: TanStack hooks (`use-auth, use-coach-profile, use-categories, use-exercises, use-programs,
  use-student, use-billing`). **lib/hooks/use-debounce.ts**. `lib/utils.ts` (`cn`).
- **messages/** `fa.json`, `en.json` — **all UI strings; zero hardcoded text in components.** Adding a string =
  add to both files under a namespace, use `useTranslations('namespace')`.
- **RTL:** use logical Tailwind props (`ps-/pe-/ms-/me-/start-/end-`) + `rtl-flip` class for directional icons.

---

## 7. Data model (Prisma — `backend/prisma/schema.prisma`)

13 models. PK = cuid unless noted. Key fields + relations:

- **User** (`id`, `phone?`@unique, `email?`@unique, `passwordHash?` reserved, `role` Role, `locale`).
- **OtpToken** (`identifier`, `channel` OtpChannel, `purpose` OtpPurpose, `codeHash`, `expiresAt`,
  `consumedAt?`, `attempts`) — codes/magic-links stored **hashed**, single-use, rate-limited.
- **RefreshToken** (`userId`, `tokenHash`@unique, `userAgent?`, `expiresAt`, `revokedAt?`) — rotated on use.
- **CoachProfile** (`userId` **@id**, `handle?`@unique (public page slug `/c/<handle>`), `name`, `bio?`,
  `avatarUrl?`, `socialLinks` Json `[{type,label,url}]`, `tags[]`) — owns categories/exercises/programs/
  students/subscriptions/payments/requests. Handle auto-generated at signup (`handle.util.ts`), editable.
- **StudentProfile** (`id`, **`userId?`** null-until-claimed, `coachId`, `phone?`, `email?`, `age?`,
  `heightCm?`, `weightKg?`) — **@@unique([coachId,phone]) / ([coachId,email])**; indexes on phone/email/userId.
- **ExerciseCategory** (`coachId`, `name`) — @@unique([coachId,name]).
- **Exercise** (`coachId`, `categoryId?`, `name`, `defaultSets` Int, `defaultReps` String, `description?`, `gifUrl?`).
- **Program** (`coachId`, `studentProfileId`, `name`, `daysPerWeek`, `status` ProgramStatus, snapshot
  `studentAge?/studentHeightCm?/studentWeightKg?`, `pdfUrl?`, `pdfStaleAt?`).
- **ProgramDay** (`programId`, `dayIndex`, `title?`) — @@unique([programId,dayIndex]).
- **ProgramExercise** (`programDayId`, `exerciseId`, `sets` Int, `reps` String, `notes?`, `order` Int,
  **`supersetGroupId?`**, **`supersetOrder?`**) — rows sharing `supersetGroupId` = one superset; `order`
  sequences rows, `supersetOrder` sequences within a group.
- **Subscription** (`coachId`, `plan` SubscriptionPlan, `status` SubscriptionStatus, `startsAt`, `endsAt`).
- **Payment** (`coachId`, `subscriptionId?`, `gateway` PaymentGateway, `plan`, `amount` Int (minor units),
  `currency`, `status` PaymentStatus, `reference?` (authority/sessionId; @@unique([gateway,reference])),
  `raw` Json).
- **ProgramRequest** (`coachId`, `studentUserId`, `studentProfileId?`, `fullName`, `phone?`, `weightKg?`,
  `heightCm?`, `practiceHistory?`, `injuries?`, `description?`, `imageKeys[]` (private object keys),
  `status` ProgramRequestStatus) — public-page intake; on submit links a StudentProfile via
  `findOrCreateForProgram`. Photos live in the **private** `requests` bucket (coach views via presigned GET).

**Enums:** `Role(COACH|STUDENT)`, `OtpChannel(SMS|EMAIL)`, `OtpPurpose(LOGIN|MAGIC_LINK)`,
`ProgramStatus(DRAFT|PUBLISHED)`, `SubscriptionPlan(M3|M6|M12)`,
`SubscriptionStatus(TRIALING|ACTIVE|EXPIRED|CANCELED)`, `PaymentGateway(ZARINPAL|STRIPE)`,
`PaymentStatus(PENDING|PAID|FAILED|REFUNDED)`, `ProgramRequestStatus(PENDING|REVIEWED|DECLINED)`.

Full ERD + linking-rule walkthrough: `docs/data-model.md`.

---

## 8. API surface (all under `/api`)

- **auth** (`@Public` except /me): `POST /auth/otp/request`, `POST /auth/otp/verify`,
  `POST /auth/magic-link/request`, `GET /auth/magic-link/consume`, `POST /auth/refresh`,
  `POST /auth/logout`, `GET /auth/me`.
- **coach-profile** (`@Roles COACH`): `GET /coach/profile`, `PATCH /coach/profile` (incl. public `handle`),
  `POST /coach/profile/avatar-upload-url`.
- **public-coach** (`@Public`): `GET /public/coaches/:handle` → public page payload (name, phone, social,
  avatar, bio, tags). Redis-cached.
- **categories** (COACH): `GET /coach/categories`, `POST` *(gated)*, `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*.
- **exercises** (COACH): `GET /coach/exercises?search=&categoryId=`, `POST` *(gated)*,
  `POST /coach/exercises/gif-upload-url`, `GET/:id`, `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*.
- **programs** (COACH): `GET /coach/programs`, `POST` *(gated)*, `GET/:id`, `PATCH/:id` *(gated)*,
  `PATCH/:id/status` *(gated)*, `DELETE/:id` *(gated)*, `GET /coach/programs/:id/pdf?locale=fa|en` (pdf module).
- **student** (`@Roles STUDENT`): `GET /student/coaches`, `GET /student/coaches/:coachId/programs`,
  `GET /student/programs/:id`, `GET /student/programs/:id/pdf?locale=` — **published-only**, ownership via
  claimed profile (drafts → 404). The PDF path reuses the coach generation/cache via
  `PdfService.getOrGenerateForStudent`.
- **program-requests** — student: `POST /student/requests/image-upload-url` (presigned PUT → private bucket),
  `POST /student/requests` (submit intake, links a StudentProfile), `GET /student/requests` (own). Coach:
  `GET /coach/requests` (inbox, with presigned photo URLs + a prefill `contact`), `PATCH /coach/requests/:id`
  (status REVIEWED/DECLINED).
- **billing** (COACH): `GET /coach/billing`, `POST /coach/billing/checkout`,
  `POST /coach/billing/dev/complete/:paymentId` (non-prod simulate).
- **gateway webhooks** (`@Public`): `GET /coach/billing/zarinpal/callback`, `POST /payments/stripe/webhook`.

*(gated)* = `@RequiresActiveSubscription()` → 402 when trial/plan lapsed.

### Key flows
- **Auth:** phone→SMS OTP, email→OTP/magic-link (providers in `notifications/` — **mock logs the code/link to
  the backend console** in dev). Access JWT cookie `access_token` (path `/`), opaque refresh `refresh_token`
  (path `/api/auth`, hashed in DB, rotated). First login creates the User (+ coach trial / + student claim).
- **Uploads (avatars/gifs):** client asks `*-upload-url` → backend returns presigned **PUT** URL (signed with the
  **public** S3 endpoint so the browser can reach it) → browser PUTs bytes to MinIO → client saves the returned
  `publicUrl` on the entity. `storage/storage.service.ts` keeps two S3 clients (internal for ops, public for presign).
  Buckets `avatars/gifs/pdfs` are **public-read**; **`requests`** (intake photos) is **private** — the request
  stores object **keys** and the coach inbox returns short-lived **presigned GET** URLs.
- **PDF:** `pdf/` renders an RTL HTML template (`program-pdf.template.ts`) with Puppeteer → uploads to `pdfs`
  bucket → caches `Program.pdfUrl`; regenerates when `pdfStaleAt` is set (every program edit sets it).
  `puppeteer-core` is **lazy-loaded**; returns 503 if Chromium/dep absent (see §9 caveat).
- **Subscriptions/payments:** trial created at registration; `subscriptions/` `isActive`/`activateOrExtend`/
  hourly `@Cron` expiry sweep. `payments/` has `PaymentProvider` interface + `ZarinpalProvider` (v4 REST) +
  `StripeProvider` (Checkout + webhook); with no gateway creds it routes to an in-app **simulate** flow.

---

## 9. Dev workflow & environment gotchas (read before editing/running)

**Run the stack:** `docker compose up -d` (from `d:/practice`). Backend `:4000` (`/api`, docs `/api/docs`),
frontend `:3000` (default `/fa`). Seed/migrations apply automatically.

**Host-published infra ports are REMAPPED** (local Postgres/Redis/MinIO occupy the defaults):
Postgres **5433**, Redis **6380**, MinIO API **9100** / console **9101**. *Inside* the compose network services
still use `postgres:5432`, `redis:6379`, `minio:9000` (containers are unaffected by the remap).
`S3_PUBLIC_ENDPOINT=http://localhost:9100` (browser-reachable).

**Adding a dependency:**
1. `pnpm add <pkg>` in `backend/` or `frontend/` (host — updates package.json + lockfile; npmjs is reachable).
2. Get it into the running container: normally `docker compose build <svc>` + recreate its `*_node_modules`
   volume. **If Docker Hub is unreachable** (happened this session), instead run in-container:
   `docker compose exec -e CI=true <svc> pnpm install` then (backend) `docker compose exec backend pnpm prisma generate`,
   then `docker compose restart <svc>`.
   (pnpm store location differs between image build and bind-mount, so a plain in-container `pnpm add` fails —
   use full `pnpm install`.)

**Windows bind-mount file watching misses NEW files.** After adding a new file/route, **restart the container**
(`docker compose restart backend|frontend`). Frontend has `WATCHPACK_POLLING=true` to mitigate; backend often
needs a manual restart to pick up new modules.

**Schema change:** edit `schema.prisma` → `docker compose exec backend pnpm prisma migrate dev --name <x>`
(or `db push` for prototyping) → Prisma client regenerates. Update `seed.ts` if needed.

**Postgres password drift:** if the persisted volume rejects creds, reset:
`docker compose exec -T postgres psql -U fitcoach -d fitcoach -c "ALTER USER fitcoach WITH PASSWORD 'fitcoach_dev_pw';"`.

**Mock OTP in dev:** the login code / magic link is printed to the backend logs
(`docker compose logs backend | grep -A2 'SMS (mock)'` or `'EMAIL (mock)'`).

### Known caveats (environment, not code)
- **PDF in Docker:** the image couldn't bake in system Chromium while the **Debian apt mirror** was down. The
  render logic is correct (verified via the template + host browser); the PDF endpoint returns **503** in the
  container until the image is rebuilt with Chromium present (`apt` step is non-fatal so the image still builds).
- **Real payments** need ZarinPal/Stripe credentials; the **simulate** flow stands in for dev (brief allows it).
- Some Phase-7 deps were added to the running container via in-container `pnpm install` (Docker Hub was down);
  rebuild images normally with `docker compose build` once Docker Hub/Debian recover for a clean delivery.

---

## 10. Testing & quality

- **Backend:** `cd backend && pnpm test` — 40 Jest unit tests (auth/OTP, identifier normalization, exercise
  filter+cache, program/superset shaping + ownership, subscription gating + activate/extend + expiry, payment
  flow + idempotency). `pnpm lint`, `pnpm build` clean.
- **Frontend:** `cd frontend && pnpm lint && pnpm build` clean (all routes).
- **Live UI checks:** Playwright via the host Edge (`channel: 'msedge'`) — used for journey/RTL/PWA verification.

---

## 11. Where to look first when editing X

| Task | Start here |
|---|---|
| Add/modify an API endpoint | `backend/src/modules/<feature>/{controller,service,dto}` + add env to `config/env.validation.ts` |
| Change a DB shape | `backend/prisma/schema.prisma` → migrate → update services + `frontend/src/lib/api/types.ts` |
| Add a UI string | `frontend/src/messages/{fa,en}.json` + `useTranslations` |
| New page | `frontend/src/app/[locale]/...` (+ wrap in `CoachPageLayout`/`StudentPageLayout`) |
| API call from UI | `frontend/src/lib/api/<feature>.ts` + `frontend/src/lib/query/use-<feature>.ts` |
| Auth/guards | `backend/src/common/guards/*`, `modules/auth/*` |
| Caching | `backend/src/common/cache/cache-keys.ts` + `RedisService.remember/invalidate` |
| Uploads | `backend/src/modules/storage/*` + `frontend/src/lib/api/upload.ts` |
| Program builder | `frontend/src/components/coach/program-builder/*` (prefill student via `?student=` on `/coach/programs/new`) |
| Subscription gating | `common/guards/subscription.guard.ts` + `@RequiresActiveSubscription()` + `modules/subscriptions/*` |
| Public coach page / handle | `modules/public-coach/*`, `common/utils/handle.util.ts`; UI `app/[locale]/c/[handle]/*` |
| Program requests (intake) | `modules/program-requests/*`; UI `app/[locale]/c/[handle]/request`, `components/coach/requests-inbox.tsx` |
| GIF lightbox / image enlarge | `frontend/src/components/shared/gif-lightbox.tsx` |
| Post-login return-to | `components/auth/{auth-form,auth-guard}.tsx` (`?next=` safe internal path) |

Related docs: `architecture.md`, `data-model.md`, `code-structure.md`, `setup.md`, `i18n-and-rtl.md`,
`api.md`, `progress.md`, `decisions/` (ADRs).
