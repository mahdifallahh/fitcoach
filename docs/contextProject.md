# contextProject — single-file map of the whole project

> Purpose: read **this file** (and the rest of `docs/`) instead of scanning the entire codebase.
> It tells an agent what the project is, where every piece lives, the patterns to follow, the data
> shapes, the API surface, and the environment gotchas. Keep it updated when architecture changes.

---

## 1. What this is

**fitlo** — a full-stack, mobile-first, **bilingual (fa-RTL default / en-LTR) PWA** where **coaches**
write training programs + manage an exercise library, and **students** view the programs written for them.
Monetization = coach-only subscriptions (7-day trial → 3M/6M/12M) via **ZarinPal (IRR)** or **Stripe (USD)**.

**Single-app architecture.** Originally two apps (NestJS API + Next.js UI); **now one Next.js app**
(`frontend/`) that serves the UI *and* the REST API as Route Handlers under `src/app/api/**`. There is no
`backend/` and no Redis. Same API paths, same `{ success, data|error }` envelope. Ported Nest services are
plain classes under `src/server/<feature>/service.ts` wired via a singleton container.

**Defining domain rule (the "linking rule"):** a coach can author a program against a student's
**phone/email before that student has an account**; when the student later registers, all prior programs
auto-link to them. Implemented via `StudentProfile.userId` being **nullable until claimed**.

**Status:** all 9 build phases implemented + the NestJS→Next.js consolidation complete (verified in Docker:
single app on `:3000`, migrate-on-boot, 46 tests green, PDF renders). See `docs/progress.md`.

---

## 2. Tech stack

- **One app:** Next.js 15 App Router + TypeScript (strict). UI *and* API (Route Handlers, `runtime='nodejs'`).
- **Data:** Prisma **5.22.0** ORM → PostgreSQL 16. (Pin Prisma at 5.22.0 — v6/v7 break generation here.)
- **Server libs:** `@aws-sdk/client-s3` → MinIO/S3, `jose` (HS256 JWT), `stripe`, `puppeteer-core` (PDF, lazy),
  `node-cron` (hourly expiry sweep via `instrumentation.ts`), `zod` (env + request validation). No Redis.
- **UI libs:** Tailwind + shadcn/ui (Radix), Framer Motion, `sonner`, `next-themes`, `next-intl` (locale
  routing), TanStack Query, React Hook Form + Zod, `@dnd-kit` (program builder).
- **Infra:** Docker Compose (postgres, minio, minio-init, app). pnpm. Node 20.

---

## 3. Repo layout

```
d:/practice
├── docker-compose.yml         # postgres + minio(+init) + app; host infra ports REMAPPED (see §9)
├── .env / .env.example        # root compose env (consumed by the app container)
├── docs/                      # ← knowledge base (this file lives here)
└── frontend/                  # the single Next.js app (UI + API)
    ├── Dockerfile             # multi-stage; installs chromium+fonts+openssl; prisma generate in deps
    ├── docker-entrypoint.sh   # dev boot: prisma generate → migrate deploy → seed → next dev
    ├── docker-entrypoint.prod.sh
    ├── .env.local / .env.example  # native-dev env (host-published infra ports)
    ├── next.config.mjs        # next-intl plugin; serverExternalPackages: prisma, puppeteer-core
    ├── instrumentation.ts     # (src/) starts node-cron once per server (nodejs runtime only)
    ├── prisma/{schema.prisma, migrations/, seed.ts}   # single source of truth for the data model
    └── src/
        ├── server/            # the API "backend" (see §4)
        ├── app/               # [locale]/… UI  +  api/**/route.ts  (see §6, §8)
        ├── components/ lib/ messages/ i18n/    # UI layer (see §6)
        └── public/            # PWA assets
```

---

## 4. Server layer (`frontend/src/server`)

Ported Nest services became plain TS classes; only their imports changed (Nest exceptions → error shims,
`AppConfigService` → `config.ts`, DI → the singleton container). Method bodies are unchanged.

- **container.ts** — lazily-instantiated singletons: `getPrisma()`, `getStorage()`, `getConfig()`, and one
  getter per feature service (`getPrograms()`, `getPayments()`, `getPdf()`, …). Guarded on `globalThis` so
  dev hot-reload doesn't re-instantiate.
- **config.ts** — zod-validated env, **lazy** (`getConfig()` parses `process.env` on first use, never at import
  → `next build` doesn't need a full env). `AppConfig.get(key)` + `isProduction` mirror the old Nest service.
  **This is the single source of truth for env vars — add new ones here.**
- **prisma.ts / storage.ts / notifications.ts** — shared singletons. `storage.ts` keeps two S3 clients
  (internal for ops, public for presigning; a presigned URL embeds the host it was signed for).
- **http/**
  - `errors.ts` — `AppError` + Nest-compatible shims (`NotFoundException`, `BadRequestException`,
    `ConflictException`, `UnauthorizedException`, `ForbiddenException`, `ServiceUnavailableException`,
    `HttpException`). Branded with `Symbol.for('fitlo.AppError')` + `isAppError()` so `mapError` recognizes
    them **across Next's dev bundles** (plain `instanceof` breaks when a module is evaluated in two bundles).
  - `envelope.ts` — `ok(data, { cookies? })` and `mapError(err)` → `NextResponse.json` (the §5 envelope).
  - `route.ts` — `withRoute(handler, { role?, requiresSub?, public?, bodySchema? })`: the guard chain
    (auth via `access_token` cookie → role → active-subscription → Zod body validate → run → envelope).
    `getSession()` verifies the access JWT with `jose`. Handler receives `{ req, user, params, body }`.
  - `rate-limit.ts` — in-memory fixed-window limiter (replaces Nest `ThrottlerGuard`; used on auth/otp routes).
  - `upload.ts` — shared `imageUploadSchema` + allowed content types.
- **auth/** `tokens.ts` (sign/verify access+refresh with jose; cookie builders — `access_token` path `/`,
  `refresh_token` path `/api/auth`, httpOnly, sameSite lax, secure-in-prod), `otp.ts` (create/verify OTP,
  hashed, 60s cooldown, attempt lock), `session.ts`, `service.ts` (`requestOtp`/`verifyOtp`/`refresh`/
  `logout`/`me`; dev `devCode` echo).
- **utils/** `identifier.ts` (normalize phone→E.164 / email→lowercase — **the linking key**), `crypto.ts`
  (OTP/token gen, sha256 hash, timing-safe compare — `node:crypto`), `handle.ts` (public-page slug gen).
- **`<feature>/`** `service.ts` (+ `schemas.ts` Zod DTOs, `service.spec.ts`): `users, coach-profile,
  categories, exercises, students, programs, public-coach, program-requests, subscriptions, payments, pdf`.
- **cron.ts** — hourly `subscriptions.expireDue()`, started once from `src/instrumentation.ts`.

### Auth/role/subscription gating
No global guards; each route opts in via `withRoute` options. Default: authenticated. `role: 'COACH'|'STUDENT'`
restricts. `requiresSub: true` gates writes → **402** when a coach's trial/plan lapses (reads stay open =
read-only). `public: true` skips auth.

### Cross-cutting conventions
Ownership always enforced in the service (`where: { id, coachId }`). Multi-table writes use
`prisma.$transaction`. Services throw the error shims with `{ code, message, details? }` so the envelope
carries a stable machine `code`.

---

## 5. Response envelope (every endpoint)

```
success: { "success": true, "data": <payload> }
error:   { "success": false, "error": { "code": "STRING_CODE", "message": "...", "details"?: any } }
```
`src/server/http/envelope.ts` produces it; frontend `lib/api/client.ts` unwraps `data` and throws
`ApiError(status, error)` on failure (and auto-refreshes once on a 401).

---

## 6. UI layer (`frontend/src`)

- **Routing:** `app/[locale]/...` (next-intl, `localePrefix: 'always'`, default `fa`). `i18n/routing.ts`
  exports locale-aware `Link, useRouter, usePathname, redirect`. **Always import nav from `@/i18n/routing`,
  not `next/link`/`next/navigation`** (except `useParams`/`useSearchParams`).
- **Pages:** `[locale]/page.tsx` (landing), `login` (**phone + OTP only**),
  `coach/{page,profile,exercises,programs/{page,new,[id]/edit},billing,requests,intake}`,
  `student/{page,coaches/[coachId],programs/[id],requests}`, and **public** `c/[handle]` +
  `c/[handle]/request` (public coach page + auth-gated intake form).
- **API routes:** `app/api/**/route.ts` — one folder per endpoint, mirroring the §8 paths. Thin: import a
  service getter from `@/server/container` and wrap with `withRoute`.
- **Brand:** app name is **fitlo** / **فیتلو** (`common.appName`); update there + `manifest.webmanifest` +
  `offline.html` + `layout.tsx` metadata if it changes.
- **components/** `ui/` shadcn primitives; `shared/` (`dashboard-shell`, `locale-switcher`, `theme-toggle`,
  `gif-lightbox`); `auth/` (`auth-form` 2-step OTP w/ dev auto-login, `auth-guard`, `logout-button`);
  `coach/` (`coach-page-layout`, `coach-nav`, `profile-form`, `exercise-library`, `program-list`,
  `billing-view`, `subscription-banner`, `download-pdf-button`, `requests-inbox`, `intake-settings`,
  **`program-builder/`** — the centerpiece); `student/` (`student-page-layout`, `student-nav`, `coaches-list`,
  `coach-programs`, `program-viewer`, `my-requests`); `providers/`; `pwa/`.
- **lib/api/**: `client.ts` (fetch wrapper: base URL **`''`** same-origin, `credentials:'include'`, envelope
  unwrap, **auto-refresh on 401**), per-feature modules, `upload.ts` (presigned-PUT helper), `types.ts`.
- **lib/query/**: TanStack hooks per feature. **messages/** `fa.json`/`en.json` — **all UI strings; zero
  hardcoded text.** Adding a string = add to both files + `useTranslations('namespace')`.
- **RTL:** logical Tailwind props (`ps-/pe-/ms-/me-/start-/end-`) + `rtl-flip` for directional icons.

---

## 7. Data model (Prisma — `frontend/prisma/schema.prisma`)

13 models. PK = cuid unless noted. Key fields + relations:

- **User** (`id`, `phone?`@unique, `email?`@unique, `passwordHash?` reserved, `role` Role, `locale`).
- **OtpToken** (`identifier`, `channel` OtpChannel, `purpose` OtpPurpose, `codeHash`, `expiresAt`,
  `consumedAt?`, `attempts`) — codes stored **hashed**, single-use, rate-limited.
- **RefreshToken** (`userId`, `tokenHash`@unique, `userAgent?`, `expiresAt`, `revokedAt?`) — rotated on use.
- **CoachProfile** (`userId` **@id**, `handle?`@unique (public page slug `/c/<handle>`), `name`, `bio?`,
  `avatarUrl?`, `socialLinks` Json `[{type,label,url}]`, `tags[]`, `cardNumber?`, `cardHolder?`,
  `programPrice?` Int Toman). Handle auto-generated at signup (`utils/handle.ts`), editable. Card/price set on
  the **Student form** (`/coach/intake`) and shown to students on the intake form.
- **StudentProfile** (`id`, **`userId?`** null-until-claimed, `coachId`, `phone?`, `email?`, `age?`,
  `heightCm?`, `weightKg?`) — **@@unique([coachId,phone]) / ([coachId,email])**.
- **ExerciseCategory** (`coachId`, `name`) — @@unique([coachId,name]).
- **Exercise** (`coachId`, `categoryId?`, `name`, `defaultSets` Int, `defaultReps` String, `description?`,
  `gifUrl?`, `videoUrl?` — optional demo video link, rendered in the viewer + PDF).
- **Program** (`coachId`, `studentProfileId`, `name`, `daysPerWeek`, `status` ProgramStatus, snapshot
  `studentAge?/studentHeightCm?/studentWeightKg?`, `pdfUrl?`, `pdfStaleAt?`).
- **ProgramDay** (`programId`, `dayIndex`, `title?`) — @@unique([programId,dayIndex]).
- **ProgramExercise** (`programDayId`, `exerciseId`, `sets` Int, `reps` String, `notes?`, `order` Int,
  **`supersetGroupId?`**, **`supersetOrder?`**) — rows sharing `supersetGroupId` = one superset.
- **Subscription** (`coachId`, `plan` SubscriptionPlan, `status` SubscriptionStatus, `startsAt`, `endsAt`).
- **Payment** (`coachId`, `subscriptionId?`, `gateway` PaymentGateway, `plan`, `amount` Int (minor units),
  `currency`, `status` PaymentStatus, `reference?` @@unique([gateway,reference]), `raw` Json).
- **ProgramRequest** (`coachId`, `studentUserId`, `studentProfileId?`, `fullName`, `phone?`, `age?`,
  `weightKg?`, `heightCm?`, `trainingYears?`, `trainingMonths?`, `medicalHistory?`, `daysPerWeek?`,
  `photoFrontKey?`/`photoSideKey?`/`photoBackKey?`, `receiptKey?`, `status` ProgramRequestStatus,
  `declineReason?`) — public-page intake; links a StudentProfile via `findOrCreateForProgram`. Photos/receipt
  in the **private** `requests` bucket. Coach accepts (**→ status flips to ACCEPTED only when the program is
  saved**, via `requestId` on program create) or declines with a reason the student sees.

**Enums:** `Role(COACH|STUDENT)`, `OtpChannel(SMS|EMAIL)`, `OtpPurpose(LOGIN|MAGIC_LINK)`,
`ProgramStatus(DRAFT|PUBLISHED)`, `SubscriptionPlan(M3|M6|M12)`,
`SubscriptionStatus(TRIALING|ACTIVE|EXPIRED|CANCELED)`, `PaymentGateway(ZARINPAL|STRIPE)`,
`PaymentStatus(PENDING|PAID|FAILED|REFUNDED)`, `ProgramRequestStatus(PENDING|ACCEPTED|DECLINED)`.

---

## 8. API surface (all under `/api`, same-origin)

- **auth** (public except /me): `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`,
  `POST /auth/logout`, `GET /auth/me`. (Email magic-link endpoints were dropped — UI is phone-only.)
- **coach-profile** (COACH): `GET /coach/profile`, `PATCH /coach/profile` (incl. public `handle`, card/price),
  `POST /coach/profile/avatar-upload-url`.
- **public-coach** (public): `GET /public/coaches/:handle` → public page payload.
- **categories** (COACH): `GET /coach/categories`, `POST` *(gated)*, `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*.
- **exercises** (COACH): `GET /coach/exercises?search=&categoryId=`, `POST` *(gated)*,
  `POST /coach/exercises/gif-upload-url`, `GET/:id`, `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*.
- **programs** (COACH): `GET /coach/programs`, `POST` *(gated; `requestId?` → marks that request ACCEPTED)*,
  `GET/:id`, `PATCH/:id` *(gated)*, `PATCH/:id/status` *(gated)*, `DELETE/:id` *(gated)*,
  `GET /coach/programs/:id/pdf?locale=fa|en`.
- **student** (STUDENT): `GET /student/coaches`, `GET /student/coaches/:coachId/programs`,
  `GET /student/programs/:id`, `GET /student/programs/:id/pdf?locale=` — **published-only**, ownership via
  claimed profile (drafts → 404).
- **program-requests** — student: `POST /student/requests/image-upload-url` (presigned PUT → private bucket),
  `POST /student/requests`, `GET /student/requests`. Coach: `GET /coach/requests` (inbox, presigned photo URLs
  + prefill `contact`), `PATCH /coach/requests/:id` (ACCEPTED/DECLINED; DECLINED requires `declineReason`).
- **billing** (COACH): `GET /coach/billing`, `POST /coach/billing/checkout`,
  `POST /coach/billing/dev/complete/:paymentId` (non-prod simulate).
- **gateway webhooks** (public): `GET /coach/billing/zarinpal/callback` (redirect),
  `POST /payments/stripe/webhook` (raw body via `req.text()`).
- **health:** `GET /api/health` (liveness; container healthcheck).

*(gated)* = `requiresSub: true` → 402 when trial/plan lapsed.

### Key flows
- **Auth:** phone→SMS OTP (mock provider logs the code; also echoed as `devCode` when not production →
  `auth-form.tsx` auto-fills + submits, one-click dev login). Access JWT cookie `access_token` (path `/`),
  opaque refresh `refresh_token` (path `/api/auth`, hashed in DB, rotated). First login creates the User
  (+ coach trial / + student claim of unlinked profiles).
- **Uploads:** client asks `*-upload-url` → presigned **PUT** URL (signed with the **public** S3 endpoint) →
  browser PUTs to MinIO → client saves the `publicUrl`. Buckets `avatars/gifs/pdfs` public-read; **`requests`**
  (intake photos) **private** — request stores object **keys**, coach inbox returns presigned GET URLs.
- **PDF:** `server/pdf/` renders an RTL HTML template with Puppeteer → uploads to `pdfs` → caches
  `Program.pdfUrl`; regenerates when `pdfStaleAt` set (every edit). `puppeteer-core` lazy-loaded
  (`webpackIgnore`); returns **503** if Chromium absent. Docker image has Chromium → renders end-to-end.
- **Subscriptions/payments:** trial at registration; `subscriptions` `isActive`/`activateOrExtend`/hourly
  cron `expireDue`. `payments` has `PaymentProvider` + `ZarinpalProvider` (v4 REST) + `StripeProvider`
  (Checkout + webhook); no gateway creds → in-app **simulate** flow.

---

## 9. Dev workflow & environment gotchas (read before editing/running)

**Run the stack:** `docker compose up --build` (from `d:/practice`). Single **app** on `:3000` (UI + `/api`,
default `/fa`). The container entrypoint runs `prisma generate` → `migrate deploy` → best-effort `seed` →
`next dev` on every boot.

**Host-published infra ports are REMAPPED** (host-native services occupy the defaults): Postgres **5434**
(5432 **and** 5433 are taken by host-native PostgreSQL 16/17 on this machine), MinIO API **9100** / console
**9101**. *Inside* the compose network the app uses `postgres:5432` / `minio:9000` (unaffected by the remap).
`S3_PUBLIC_ENDPOINT=http://localhost:9100` (browser-reachable). Compose env (`env_file: .env`) wins over the
bind-mounted `.env.local` (Next doesn't override real env vars), so the container talks to `postgres:5432`.

**Native dev (fast iteration):** `cd frontend && cp .env.example .env.local` (already targets 5434/9100),
`pnpm dev`. Run infra with `docker compose up -d postgres minio minio-init`.

**Prisma pinned at 5.22.0** — do not bump to v6/v7 (generation breaks here). `@prisma/client` + `prisma`
both `^5.22.0`.

**Adding a dependency:** `pnpm add <pkg>` in `frontend/` (host), then `docker compose build app` (or
`docker compose exec app pnpm install`) + restart.

**Windows bind-mount file watching misses NEW files.** After adding a new route file, **restart the container**
(`docker compose restart app`). `WATCHPACK_POLLING=true` mitigates but isn't perfect.

**Schema change:** edit `frontend/prisma/schema.prisma` → `pnpm prisma generate`. `prisma migrate dev` needs a
TTY (fails inside Docker) → generate SQL with `prisma migrate diff --from-schema-datasource … --to-schema-
datamodel … --script`, hand-write `prisma/migrations/<ts>_<name>/migration.sql`, then `prisma migrate deploy`.

**Mock OTP in dev:** `POST /api/auth/otp/request` echoes the code as `devCode` when not production; the login
form auto-fills + submits it → one-click dev login. Never present when `NODE_ENV=production`.

### Known caveats
- **Edge bundle + node builtins:** anything reachable from `instrumentation.ts` / middleware must not statically
  pull Node-only code (`node:crypto`, Prisma) into the Edge build. `instrumentation.ts` guards the cron import
  behind `process.env.NEXT_RUNTIME === 'nodejs'` so webpack dead-code-eliminates it from the Edge bundle.
- **`instanceof` across dev bundles:** use `isAppError()` (Symbol-branded), not `instanceof AppError`, in code
  that inspects thrown errors — Next dev can evaluate `errors.ts` in two bundles.
- **Real payments** need ZarinPal/Stripe creds; the **simulate** flow stands in for dev.
- **Swagger** was dropped with NestJS (add an OpenAPI generator later if wanted).

---

## 10. Testing & quality

- `cd frontend && pnpm test` — **46 Jest tests** in `src/server/**/*.spec.ts` (auth/OTP, identifier + handle
  utils, exercise filter, program/superset shaping + ownership, subscription gating + activate/extend + expiry,
  payment flow + idempotency, PDF template). ts-jest with `tsconfig.jest.json`; `server-only` stubbed via
  `test/server-only.js`.
- `pnpm build` (= typecheck + compile, incl. spec files) and `pnpm lint` clean.
- **Live UI checks:** Playwright via host Edge (`channel: 'msedge'`); API checks via `curl` against `:3000`.

---

## 11. Where to look first when editing X

| Task | Start here |
|---|---|
| Add/modify an API endpoint | `src/server/<feature>/{service,schemas}.ts` + `src/app/api/<path>/route.ts` (wrap with `withRoute`) + add env to `src/server/config.ts` |
| Change a DB shape | `frontend/prisma/schema.prisma` → `prisma generate` + migration → update service + `src/lib/api/types.ts` |
| Add a UI string | `src/messages/{fa,en}.json` + `useTranslations` |
| New page | `src/app/[locale]/...` (+ wrap in `CoachPageLayout`/`StudentPageLayout`) |
| API call from UI | `src/lib/api/<feature>.ts` + `src/lib/query/use-<feature>.ts` |
| Auth / cookies / JWT | `src/server/auth/*`, `src/server/http/route.ts` (`getSession`, `withRoute`) |
| Uploads | `src/server/storage.ts` + `src/lib/api/upload.ts` |
| Program builder | `src/components/coach/program-builder/*` (prefill student via `?student=`, request via `?request=` on `/coach/programs/new`) |
| Subscription gating | `withRoute({ requiresSub: true })` + `src/server/subscriptions/*` |
| Public coach page / handle | `src/server/public-coach/*`, `src/server/utils/handle.ts`; UI `app/[locale]/c/[handle]/*` |
| Program requests (intake) | `src/server/program-requests/*`; UI `app/[locale]/c/[handle]/request`, `components/coach/requests-inbox.tsx` |
| Background cron / expiry | `src/instrumentation.ts` + `src/server/cron.ts` + `src/server/subscriptions/service.ts` |
| Payments / webhooks | `src/server/payments/*`; routes `app/api/coach/billing/*`, `app/api/payments/stripe/webhook` |

Related docs: `architecture.md`, `data-model.md`, `code-structure.md`, `setup.md`, `i18n-and-rtl.md`,
`api.md`, `progress.md`, `decisions/` (ADRs).
