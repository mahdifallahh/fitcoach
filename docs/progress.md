# Implementation Progress

Living checklist mirroring the 9 build phases. Update statuses as work lands.
Legend: ✅ done · 🚧 in progress · ⬜ not started

## Post-launch — Intake form, payment, video links, phone-only, rebrand  ✅
- ✅ **Auth is phone + OTP only** (email/magic-link removed from the UI).
- ✅ **Rebrand** FitCoach → **fitlo / فیتلو** (messages, manifest, offline page, metadata).
- ✅ **Student intake form** expanded: full name, age, weight, height, training history (years+months),
  illness/injury, days per week, **3 labeled photos** (front/side/back), **payment receipt**. Coach sets
  **card number + holder + program price** (`/coach/intake` "Student form"), shown to the student on the form.
- ✅ **Request lifecycle:** student submits → coach inbox (all fields + signed photos) → **Write program**
  (ACCEPTED → builder prefilled) or **Decline with a required reason**; student sees status + reason in
  **My requests** (`/student/requests`). Migration `…_intake_form_card_price_video` (enum → PENDING/ACCEPTED/DECLINED).
- ✅ **Exercise video link** (`videoUrl`, optional) — in the exercise form, the student viewer (watch link),
  and the **PDF** (description + video link). 46 backend tests green (added PDF-template + handle tests).
- ✅ Fixed: optional number inputs coerced empty → `undefined` (not `0`). Verified live (Playwright, 10/10 checks)
  + backend curl smoke (card/price, photos, accept/decline+reason, student status).
- ✅ **Accept-on-save:** "Write program" from the inbox no longer flips the request — it navigates with
  `?student=&request=`; `CreateProgramDto.requestId` marks the request **ACCEPTED inside the program-create
  transaction**, so it only counts once the program is actually saved (verified: PENDING before save →
  ACCEPTED after → student sees it).
- ✅ **Mobile-first audit** (390×844, fa/RTL, Playwright): all 15 key screens — landing, login, public page,
  request form, coach dashboard/requests/programs/builder(+picker)/exercises(+dialog)/intake/profile/billing,
  student home/my-requests/viewer — **zero horizontal overflow**, dialogs and forms stack full-width, tap
  targets comfortable. Dev-mode service worker now auto-unregisters (stale-chunk crash fix, `fitlo-v2` cache).

## Post-launch — Public pages + program-request intake  ✅
Growth/onboarding loop on top of the 9 phases (plan: `▶ CURRENT WORK` in the plan file).
- ✅ Schema: `CoachProfile.handle` (unique, auto-generated `handle.util.ts`) + `ProgramRequest` model +
  `ProgramRequestStatus` enum + migration `…_program_requests_and_handle`.
- ✅ Private **`requests`** S3 bucket (intake photos): env + `minio-init` (no anonymous read); coach views via
  presigned GET. `BucketKind` extended.
- ✅ **public-coach** module: `@Public GET /public/coaches/:handle` (Redis-cached). **coach-profile** PATCH
  accepts/validates `handle` (409 `HANDLE_TAKEN`), lazy back-fill on read.
- ✅ **program-requests** module: student submit (+ image-upload-url, links a StudentProfile) / own list; coach
  inbox (signed photo URLs + prefill contact) / status PATCH.
- ✅ **Student PDF**: `GET /student/programs/:id/pdf` → `getOrGenerateForStudent` (reuses coach gen/cache;
  ownership-enforced).
- ✅ Frontend: shared **GIF lightbox** (viewer + library), **student PDF** button in viewer, **public coach page**
  `/c/<handle>` + auth-gated **intake form** `/c/<handle>/request`, **post-login return** (`?next=`), **Requests
  inbox** + nav, **public-link** card on the profile, builder **`?student=` prefill**.
- ✅ **Verified live (Playwright + curl):** handle save → public page (logged-out) → Request → bounce to login →
  student login → back to form → submit → coach inbox shows it → **Start program** opens builder prefilled.
  Student PDF generates + blocks non-owners (404). Backend `pnpm build` + 40 tests green; frontend build clean.

## Phase 1 — Scaffold + Docker  ✅
- ✅ Repo layout (`backend/`, `frontend/`, `docs/`, root compose)
- ✅ `docker-compose.yml` (postgres, redis, minio, minio-init, backend, frontend) with healthchecks
- ✅ Root `.env.example`, `README.md`, `.gitignore`
- ✅ `docs/` knowledge base (architecture, data-model, code-structure, setup, i18n, api, ADRs)
- ✅ Backend NestJS scaffold (config+zod env validation, Prisma, Redis, common filter/interceptor, health) + multi-stage Dockerfile + `.env.example`
- ✅ Full Prisma schema + `0_init` migration + idempotent seed (demo coach, unlinked student, superset program)
- ✅ Frontend Next.js scaffold (App Router, next-intl fa/en + RTL, next-themes blue/white, TanStack Query, shadcn Button, landing) + Dockerfile + `.env.example`
- ✅ **Checkpoint verified:** `docker compose up` → all 5 containers healthy; backend `/api/health` + readiness (DB+Redis up); migration+seed run in-container; Swagger `/api/docs` 200; frontend `/` → `/fa`, RTL/LTR render correct; MinIO buckets created.

**Dev-env notes (Windows + Docker Desktop):** compiled output uses container-local volumes
(`backend_dist`, `frontend_next`) to avoid flaky bind-mount writes; `incremental` TS build disabled;
Next `output:'standalone'` gated behind `NEXT_OUTPUT=standalone` (Dockerfile only); host ports 5432/6379/9000
may collide with local services — see [setup.md](./setup.md) Troubleshooting.

## Phase 2 — Auth (passwordless)  ✅
- ✅ Prisma schema + `0_init` migration + seed (done in Phase 1)
- ✅ Phone OTP (SMS) + email OTP/magic-link behind pluggable providers (mock logs codes/links)
- ✅ JWT access (stateless) + rotating opaque refresh (hashed, revocable) in httpOnly cookies; logout
- ✅ Global guards (JWT auth + roles) with `@Public`; throttling on OTP endpoints
- ✅ Account creation on first login: coaches get a starter profile + 7-day trial; students auto-claim profiles
- ✅ Frontend login (2-step OTP, both locales/roles), auth guard, coach/student dashboards, logout
- ✅ Backend tests (20 passing): identifier normalization, OTP issue/verify/lock, coach trial + student claim
- ✅ **Checkpoint verified:** OTP login (coach→trial sub, student→claim), `/auth/me`, refresh **rotation**
  (old token revoked → 401), logout, 401 on unauth, CORS credentialed, login UI renders fa/en.

**Note:** student auto-claim (the linking rule) is implemented + verified now; the student-facing UI
(coach list, program viewer) lands in Phase 6.

## Phase 3 — Coach profile + categories + exercise library  ✅
- ✅ `StorageService` (S3/MinIO) — dual endpoint: presign on **public** endpoint, server ops on **internal**;
  presigned PUT direct-upload + path-style public URLs; avatars/gifs buckets public-read.
- ✅ Coach profile (`GET/PATCH /coach/profile` + avatar upload-url) — name, bio, social links list, tags.
- ✅ Category CRUD (`/coach/categories`, per-coach unique, 409 on dup), cached.
- ✅ Exercise CRUD (`/coach/exercises`) + GIF upload-url + `?search=&categoryId=` (in-memory filter over cache).
- ✅ Redis caching (`coach:{id}:profile|categories|exercises`) with write invalidation (reuses `RedisService`).
- ✅ Frontend: coach nav, profile editor (RHF+Zod, avatar upload, dynamic social links, tags), exercise
  library (debounced search + category filter + grid + skeleton/empty states), create/edit dialog with GIF
  upload + preview, category manager dialog. fa/en namespaces; global `timeZone` set.
- ✅ 26 backend Jest tests green (adds exercises filter + cache-invalidation suite).
- ✅ **Checkpoint verified (curl + live headless-browser test):** coach login → edit profile + **browser
  avatar upload to MinIO** (presigned PUT, CORS OK) → add category (409 on dup) → create exercise with
  **GIF upload** → renders in searchable/filterable list → student blocked from `/coach/*` (403) → full
  RTL mirroring on fa locale. Screenshots captured.

**Dev note:** apps run in Docker (host-based dev hit a local Postgres on :5432). Infra host ports remapped
to 5433/6380/9100. After a Docker engine restart, recreate/restart app containers to refresh the port proxy.

## Phase 4 — Program builder + list/edit  ✅
- ✅ `students` module — find-or-create StudentProfile by (coach, phone/email), updates stats, **forward-links**
  to an already-registered student account (reverse claim stays in `UsersService`).
- ✅ `programs` module — nested transactional create; **replace-on-update** (drop days → recreate) sets
  `pdfStaleAt`; list/get/setStatus(publish)/delete; ownership + exercise-ownership guards; supersets via
  shared `supersetGroupId` + `order`/`supersetOrder`.
- ✅ Frontend builder (dnd-kit): meta form (student contact + stats + days/week), day tabs, searchable/
  category-filtered **exercise picker**, single + **superset** rows (visually grouped), inline sets×reps
  override, **drag-to-reorder** rows, draft/publish; program list with status badges + delete.
- ✅ Lossless round-trip via `stateFromProgram`/`daysToPayload` (reconstruct ↔ flatten).
- ✅ 28 backend Jest tests green (adds program create/ownership/superset-shaping suite).
- ✅ Fixed next-intl global `timeZone` (passed through layout → `NextIntlClientProvider`) — clears the
  date-format hydration warning.
- ✅ **Checkpoint verified (live headless-browser test):** seed exercises → build a 2-day program with a
  3-exercise superset → publish → reopen in editor → **superset + daysPerWeek preserved losslessly**;
  full RTL mirroring of the builder on fa. Screenshots captured; only a benign static-asset 404 remains.

**Dev note:** adding `@dnd-kit/*` required rebuilding the frontend image + recreating its `node_modules`
volume (pnpm store location differs between image build and bind-mount, so in-container `pnpm add` fails).

## Phase 5 — PDF export  🟡 (code complete; Docker Chromium image pending a clean build)
- ✅ `pdf` module — `PdfService` (lazy Chromium singleton via **puppeteer-core**), RTL HTML template with
  supersets boxed + HTML-escaped content, fa/en labels; renders → uploads to `pdfs` bucket → caches
  `Program.pdfUrl`; **regenerates on demand when `pdfStaleAt` is set** (set by every program edit).
- ✅ `GET /coach/programs/:id/pdf?locale=` + frontend `DownloadPdfButton` on the program list (fa/en).
- ✅ Backend + frontend host builds pass; backend lint/tests green (28).
- ✅ **Render verified**: drove the exact `renderProgramHtml` template through puppeteer-core + the host
  browser → produced a valid 77 KB A4 PDF. Visual check confirms polished **RTL Persian** layout, wrapping
  header meta, day headings, single exercise + description, and a **boxed superset** (سوپرست label, two
  grouped exercises with notes); English exercise names stay LTR. (See scratchpad `program-sample2.png`.)
- 🟡 Dockerfile adds system `chromium` + Noto/Liberation fonts. The image build is currently **blocked by a
  transient outage of this host's Debian apt mirror** (it succeeded for Phases 1–4 earlier today, now
  `Connection failed … 80` over both HTTP and HTTPS). Hardened the step (HTTPS mirror + IPv4 +
  combined update+install retry loop); it will build cleanly once the mirror is reachable again.
- ⬜ Remaining: rebuild the backend image when the mirror recovers → live PDF download through the running
  API (the render itself is already proven correct above).
- Note: chose **on-demand regeneration** (simpler, matches the brief) over a BullMQ repeatable job.

## Phase 6 — Student flow  ✅
- ✅ Student-facing API (`@Roles(STUDENT)`): `GET /student/coaches`, `/student/coaches/:id/programs`,
  `/student/programs/:id` — **published-only**, ownership enforced via the claimed StudentProfile
  (`student.userId = me`). A draft / other student's program returns **404**.
- ✅ Frontend: coaches list (avatar, contact, program count), per-coach program list, and the **calm
  program viewer** — day pills, large exercise cards with GIF preview, prominent sets×reps badge,
  description + notes, supersets boxed. Mobile-first, fully RTL-mirrored.
- ✅ Auto-claim (linking rule) reused from `UsersService`; coach-side `findOrCreateForProgram` also
  forward-links if the student already registered.
- ✅ Fixed a hydration bug (a `<Badge>` `<div>` nested in `<p>`).
- ✅ **Checkpoint verified (live headless test):** coach publishes a 2-day program (with a GIF exercise +
  a superset) for an email → that email registers as a student → lands on coaches list → opens the coach →
  opens the program → calm viewer shows the GIF, superset block, and sets/reps. Confirmed in en + fa (RTL).
  Draft program excluded from all student views. Console clean (only a benign asset 404).

## Phase 7 — Subscriptions + payments  ✅
- ✅ `subscriptions`: trial created at registration; `isActive` (trial/active + not past), `activateOrExtend`
  (stacks from later of now/current end), hourly **expiry sweep** via `@nestjs/schedule` `@Cron`.
- ✅ **Write-gating**: `SubscriptionGuard` + `@RequiresActiveSubscription()` on program/exercise/category
  mutations → **402** when lapsed; reads (GET) stay **200** (read-only access preserved).
- ✅ `payments`: `PaymentProvider` abstraction with real **ZarinpalProvider** (v4 REST, IRR) +
  **StripeProvider** (Checkout Sessions + webhook, USD); `PaymentsService` orchestrates plan→price,
  persists `Payment`, idempotent activate. ZarinPal redirect-verify callback + Stripe webhook (raw body).
  When no gateway creds (dev) → an in-app **simulate** flow (brief explicitly allows simulated payment).
- ✅ Billing API + UI: status card, ZarinPal/Stripe currency toggle, plan cards, payment history,
  read-only banner. 40 backend Jest tests (adds gating, activate/extend, expiry, payment-flow + idempotency).
- ✅ **Checkpoint verified (live):** trial create=201 → force-expire → create=**402**, read=**200** →
  checkout (ZarinPal simulate) → complete → subscription **ACTIVE (M3, +3mo)** → create=**201**. Billing UI
  renders en (USD) with simulate-mode note. Pricing: 3mo \$19 / 6mo \$34 / 12mo \$59 (IRR equivalents for ZarinPal).
- Chose `@nestjs/schedule` cron over BullMQ (lighter; sweep is a simple periodic query).

**Dev note:** Docker Hub was unreachable, blocking image rebuilds; added the new deps to the running
container via in-container `pnpm install` + `prisma generate` (npmjs was up). Rebuild the image normally
once Docker Hub recovers.

## Phase 8 — i18n + theming polish  ✅
- ✅ Audit: **zero hardcoded UI strings** (placeholders/labels/alt/text all via `next-intl` `t()`); complete
  fa/en message catalogs across all namespaces.
- ✅ RTL mirroring verified on every major screen (login, exercise library, program builder, student viewer,
  billing, landing) — logical CSS props + `rtl-flip` for directional icons.
- ✅ Blue/white brand in **light + dark** (CSS variables + next-themes, system default + persisted); fonts
  Vazirmatn (fa) / Inter (en) switched by locale via `next/font`.
- ✅ **Checkpoint verified:** locale (fa↔en) and theme (light↔dark) toggle app-wide with correct
  direction/fonts/colors — confirmed incl. the dark-mode RTL landing screenshot.

## Phase 9 — PWA  ✅
- ✅ Manual PWA (no `next-pwa` dep — works in dev & avoids prod-only SW generation): `manifest.webmanifest`
  (standalone, blue `theme_color`, 192/512 + maskable icons), brand icons (SVG rasterized to PNG via the
  host browser), `apple-touch-icon`, `themeColor` viewport.
- ✅ Hand-written `public/sw.js`: precaches the app shell + offline page, network-first navigations with
  offline fallback, cache-first for `/_next/static` + icons; registered via a client `ServiceWorkerRegister`.
- ✅ Bilingual `offline.html` fallback.
- ✅ **Checkpoint verified (live):** assets serve 200; head has manifest + theme-color + apple-touch-icon;
  service worker registers + becomes active; navigating while **offline** serves the cached fallback. Manifest
  + SW + icons satisfy installability.

---

## Status summary
Phases **1–9 implemented**, then **consolidated from two apps (NestJS + Next.js) into one Next.js app**
(see the migration section below). Real payment gateways need ZarinPal/Stripe credentials (the simulate flow
stands in for dev, per the brief). **46 Jest tests green** (now in `frontend/src/server`). App lints clean and
builds clean.

---

## Migration — NestJS API folded into the Next.js app  ✅ (verified in Docker)

Collapsed the two-app stack into a **single Next.js app** (`frontend/`) that serves the UI *and* the REST API
as Route Handlers. `backend/` and Redis were removed.

- **Phase 1 — server infra:** `src/server/{config,prisma,storage,notifications,container}.ts`,
  `http/{errors,envelope,route,rate-limit,upload}.ts`, `auth/{tokens,otp,session,service}.ts`, `utils/*`.
  jose JWT, zod env (lazy), error shims with a `Symbol.for` brand. Prisma pinned to **5.22.0**.
- **Phase 2 — auth routes:** `app/api/auth/{otp/request,otp/verify,refresh,logout,me}`; client `API_BASE=''`.
  Verified E2E: OTP request (devCode) → verify (coach + trial, cookies) → me → refresh (rotate) → logout → 401.
- **Phase 3 — feature services + routes:** coach-profile, categories, exercises, programs, students,
  public-coach, program-requests, billing — ~34 routes, all curl-verified (incl. accept-on-save flipping a
  request to ACCEPTED, decline-with-reason, role 403, dup 409, subscription reads).
- **Phase 4 — cron + webhooks + PDF:** `instrumentation.ts` starts hourly `node-cron` (Edge-DCE-guarded);
  ZarinPal callback (307 redirect) + Stripe webhook (raw body, 400 on bad sig); coach/student PDF routes.
- **Phase 5 — consolidate:** single Docker image (Chromium + openssl + `prisma generate`), migrate-on-boot
  entrypoint, one `app` service in compose (postgres + minio only), `backend/` deleted, docs updated.
  **46 Jest specs ported** to `src/server`. `docker compose up --build` → app healthy on `:3000`, migrations
  auto-applied, full OTP login works, **PDF renders end-to-end** (real 42 KB PDF served from MinIO).

**Removed:** NestJS, Redis (reads hit Postgres directly; OTP rate-limit is in-memory), Swagger, the unused
email magic-link endpoints, `NEXT_PUBLIC_API_URL`/`BACKEND_INTERNAL_URL`, CORS (API is same-origin).

**Environment note:** host has native PostgreSQL on 5432 **and** 5433, so the Docker Postgres publishes on
**5434**. Docker Desktop needed occasional restarts.
- ⬜ Manifest, icons, service worker, offline fallback, installability
- ⬜ Checkpoint: installable; app shell loads offline; Lighthouse PWA passes

## Testing  ⬜
- ⬜ Backend: auth, subscription gating, payment webhook, student linking
- ⬜ Frontend: program-builder superset + reorder smoke tests
