# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

**Read [`docs/contextProject.md`](./docs/contextProject.md) first.** It is the maintained single-file map of
this project — architecture, full data model, complete API surface, request/response envelope, upload/PDF/
payment flows, environment gotchas, and a "where to look first when editing X" table. Read it instead of
grepping the whole codebase for orientation. Update it when you change architecture, add an endpoint,
or touch the data model — it decays fast if left stale.

Other docs worth knowing about: `docs/architecture.md`, `docs/data-model.md`, `docs/code-structure.md`,
`docs/setup.md`, `docs/i18n-and-rtl.md`, `docs/logoContext.md` (brand assets + light/dark primary colors),
`docs/api.md`, `docs/progress.md` (living per-phase build checklist), `docs/decisions/` (ADRs).

## What this is

**fitlo** — a full-stack, mobile-first, bilingual (Persian RTL default / English LTR) PWA for personal
trainers and their students. Coaches manage an exercise library and author day-by-day training programs
(with supersets) with PDF export; students view programs written for them. Coaches monetize via
subscriptions (a coach-activated 15-day free trial, one-time only → 3/6/12-month plans) paid through
ZarinPal (IRR) or Stripe (international). Coaches also get a public link-in-bio page (`/c/<handle>`) where
prospective students submit an intake request (stats, photos, payment receipt) that lands in the coach's inbox.

**Single-app architecture.** This was originally two apps (NestJS API + Next.js UI); it is now **one Next.js
app** (`app/`) that serves the UI *and* the REST API as Route Handlers under `src/app/api/**`. There is
no `backend/` and no Redis. The API keeps the exact same paths and `{ success, data | error }` envelope, so
the typed client + TanStack Query hooks are unchanged. Ported Nest services live under `src/server/<feature>/
service.ts` as plain classes wired through a tiny singleton container (`src/server/container.ts`).

**The defining domain rule:** a coach can author a program for a student by entering just their phone —
*before that student has an account*. When the student later registers with the same phone, every program
previously written for them is automatically linked (`StudentProfile.userId` is nullable until claimed).

**Auth is phone + OTP only** (no email/password, no magic-link in the UI). In non-production, `POST
/api/auth/otp/request` echoes the code back as `devCode`, and the login form auto-fills and auto-submits it —
so local login is a single click with no need to read logs.

## Commands

Everything runs through Docker Compose; there is no repo-root package.json.

```bash
cp .env.example .env
docker compose up --build       # postgres, minio(+init), app  (migrations apply on boot)
```

| Service | URL |
|---|---|
| App (UI + API) | http://localhost:3000 (default locale `/fa`; API under `/api`) |
| MinIO console | http://localhost:9101 |

Host-published infra ports are remapped to avoid local service collisions: Postgres `5434` (5432/5433 are
taken by host-native PostgreSQL on this machine), MinIO API `9100` / console `9101`. The container talks to
infra on the default in-network ports (`postgres:5432`, `minio:9000`) — the remap only affects host access.

### App (`cd app`)

```bash
pnpm dev                    # next dev (UI + /api)
pnpm build                  # next build — this is also the typecheck step (no separate tsc script)
pnpm lint                   # next lint
pnpm test                   # jest — server-layer specs under src/server/**/*.spec.ts (46 tests)
pnpm test -- <pattern>      # run specs matching a file/name, e.g. pnpm test -- programs
pnpm prisma:generate        # regenerate Prisma client after a schema change
pnpm prisma:migrate         # prisma migrate deploy (apply pending migrations)
pnpm db:seed                # prisma db seed (demo coach, unlinked student, superset program)
```

Native dev: `cp .env.example .env.local`, point `DATABASE_URL`/`S3_*` at the host-published infra ports,
then `pnpm dev`. (The bundled `.env.local` already targets Postgres `5434` / MinIO `9100`.)

### Common Docker workflows

```bash
docker compose logs app -f                          # tail logs; OTP devCodes print here too
docker compose restart app                          # pick up new route files (see caveat below)
docker compose exec app pnpm prisma migrate deploy  # apply a hand-written migration
docker compose exec app pnpm prisma generate        # regenerate client after a schema change
```

The container entrypoint (`app/docker-entrypoint.sh`) runs `prisma generate` → `prisma migrate deploy`
→ best-effort `db:seed` → `pnpm dev` on every boot.

**Windows bind-mount file watching misses newly created files.** After adding a new route/file, restart the
container — `WATCHPACK_POLLING` helps but doesn't always catch brand-new files.

## Architecture (brief — full detail in `docs/contextProject.md`)

- **Server layer:** ported Nest services are plain classes under `src/server/<feature>/service.ts`, wired via
  lazily-instantiated singletons in `src/server/container.ts` (`getPrograms()`, `getPayments()`, …). Shared
  infra: `config.ts` (zod-validated env, lazy), `prisma.ts`, `storage.ts`, `notifications.ts`. Error shims in
  `src/server/http/errors.ts` (`NotFoundException`, `BadRequestException`, …) keep ported bodies unchanged;
  they carry a `Symbol.for('fitlo.AppError')` brand so `mapError` recognizes them across Next's dev bundles.
- **Route Handlers:** one folder per endpoint under `src/app/api/**/route.ts`. Most use
  `withRoute(handler, { role?, requiresSub?, public?, bodySchema? })` from `src/server/http/route.ts` — the
  guard chain (auth via `access_token` cookie → role → active-subscription → Zod body validation → run →
  `{success,data}` envelope). Auth/webhook routes set cookies / handle raw bodies manually. All API routes are
  `runtime = 'nodejs'`.
- **Response envelope:** every endpoint returns `{ success: true, data }` or `{ success: false, error: {
  code, message, details? } }` (see `src/server/http/envelope.ts`). The UI's `lib/api/client.ts` (base
  URL `''` — same-origin) unwraps this and throws `ApiError`; it transparently refreshes once on a 401.
- **UI:** Next.js App Router under `src/app/[locale]/...`, routed via `next-intl`
  (`i18n/routing.ts` — always import `Link`/`useRouter`/`usePathname` from there, not `next/link`). Data
  layer: typed `lib/api/*.ts` modules + TanStack Query hooks in `lib/query/*.ts`. All UI copy lives in
  `messages/{fa,en}.json` — zero hardcoded strings in components; add new copy to both files.
- **SEO:** `lib/site.ts` derives everything from **`NEXT_PUBLIC_SITE_URL`** (set it to the real domain in prod).
  `app/robots.ts` + `app/sitemap.ts` are generated; public pages export `generateMetadata` (canonical, hreflang
  fa/en/x-default, OG) and emit JSON-LD via `shared/json-ld.tsx`. The indexable surface is the landing, the
  blog (`lib/blog.ts` — typed bilingual content blocks; append to `POSTS` to add one), and each coach's
  server-rendered `/c/<handle>` page. Coach/student panels are disallowed in robots.
- **Onboarding:** new users get lost without it — `coach/getting-started.tsx` is a data-driven first-run
  checklist and `student/student-help.tsx` a dismissible explainer; the landing spells out both roles in 3 steps.
  Keep these in sync when you add a core coach step.
- **Prisma schema** (`app/prisma/schema.prisma`) is the single source of truth for the data model; run
  `prisma:generate` after any change and add a migration. `prisma migrate dev` needs a TTY (fails inside
  Docker) — use `migrate diff --script` + hand-write the migration file, then `migrate deploy` (see
  contextProject.md §9). Pin Prisma at **5.22.0** (v6/v7 break generation here).
- **Background work:** `src/instrumentation.ts` starts an hourly `node-cron` subscription-expiry sweep once per
  server process, guarded to the Node runtime (`process.env.NEXT_RUNTIME === 'nodejs'`) so it is dead-code-
  eliminated from the Edge (middleware) bundle — otherwise its `node:crypto`/Prisma graph breaks the build.
- **No cache layer:** Redis was removed. Reads hit Postgres directly; the OTP rate-limiter is an in-memory
  fixed-window limiter (`src/server/http/rate-limit.ts`), fine for the single Node server.
- **Storage:** S3/MinIO via `src/server/storage.ts`, which keeps two clients — one for server-side ops
  (internal endpoint) and one for presigning (public endpoint), because a presigned URL's signature embeds the
  host it was signed for. Buckets `avatars`/`gifs`/`pdfs` are public-read; `requests` (student intake photos/
  receipts) is private — the coach inbox reads them via short-lived presigned GETs.
- **PDF:** Puppeteer renders an RTL-aware HTML template (`src/server/pdf/template.ts`) to a PDF cached on
  `Program.pdfUrl`, invalidated via `pdfStaleAt` on every program edit. `puppeteer-core` is lazy-imported
  (`webpackIgnore`) so the app still boots if Chromium isn't present; the endpoint degrades to a clean 503
  instead of a 500. The Docker image installs Chromium; PDF renders end-to-end there.
