# contextProject — single-file map of the whole project

> Purpose: read **this file** (and the rest of `docs/`) instead of scanning the entire codebase.
> It tells an agent what the project is, where every piece lives, the patterns to follow, the data
> shapes, the API surface, and the environment gotchas. Keep it updated when architecture changes.

---

## 1. What this is

**fitlo** — a full-stack, mobile-first, **bilingual (fa-RTL default / en-LTR) PWA** where **coaches**
write training programs + manage an exercise library, and **students** view the programs written for them.
Monetization = coach-only subscriptions (a coach-activated, one-time 15-day free trial → paid plans) via
**ZarinPal (IRR)** (Stripe is present in code but disabled for checkout). **Public pricing is currently
"coming soon"**: the landing + billing pages show three *student-scoped* tiers — Economy (≤10 students),
Standard (≤50), Professional (unlimited) — from `lib/plans.ts` `TIERS` with **no price** and disabled buy
buttons; the only live CTA is the free trial. The month-based `PUBLIC_PLANS`/server `PLANS` + ZarinPal checkout
stay wired for when real prices are set (the billing view no longer calls checkout meanwhile).

**Single-app architecture.** Originally two apps (NestJS API + Next.js UI); **now one Next.js app**
(`app/`) that serves the UI *and* the REST API as Route Handlers under `src/app/api/**`. There is no
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
└── app/                        # the single Next.js app (UI + API)
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

## 4. Server layer (`app/src/server`)

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

The **UI mirrors this** so write buttons don't look clickable-then-fail: `lib/hooks/use-write-access.ts`
(`useWriteAccess()`) returns `canWrite` (coach has an active/unexpired TRIALING|ACTIVE sub — also false for a
coach who hasn't activated the free trial yet, matching the server). The create/save/delete/assign actions in
`program-list`, `template-list`, `exercise-library`, both builders and `profile-form` disable + show a lock icon
with the `billing.lockedTitle` tooltip; `subscription-banner` explains why and links to billing. The server 402
remains the source of truth.

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
`src/server/http/envelope.ts` produces it; the UI's `lib/api/client.ts` unwraps `data` and throws
`ApiError(status, error)` on failure (and auto-refreshes once on a 401).

---

## 6. UI layer (`app/src`)

- **Routing:** `src/app/[locale]/...` (next-intl, `localePrefix: 'always'`, default `fa`). `i18n/routing.ts`
  exports locale-aware `Link, useRouter, usePathname, redirect`. **Always import nav from `@/i18n/routing`,
  not `next/link`/`next/navigation`** (except `useParams`/`useSearchParams`).
- **Pages:** `[locale]/page.tsx` (marketing landing: hero → features → how-it-works → FAQ → CTA → footer),
  `blog/` + `blog/[slug]` (bilingual content, statically prerendered), `login` (**phone + OTP only**),
  `coach/{page,profile,exercises,programs/{page,new,[id]/edit},billing,requests,intake}`,
  `student/{page,coaches/[coachId],programs/[id],requests}`, and **public** `c/[handle]` (server-rendered,
  indexable) + `c/[handle]/request` (auth-gated intake form). `error.tsx` is the locale error boundary.
- **API routes:** `src/app/api/**/route.ts` — one folder per endpoint, mirroring the §8 paths. Thin: import a
  service getter from `@/server/container` and wrap with `withRoute`.
- **Brand:** app name is **fitlo** / **فیتلو** (`common.appName`); update there + `manifest.webmanifest` +
  `offline.html` + `layout.tsx` metadata if it changes.
- **Onboarding (users get lost without it):** `coach/getting-started.tsx` is a data-driven first-run checklist
  (profile → first exercise → first program → payment details) that auto-hides when complete or dismissed
  (`localStorage: fitlo:onboarding-dismissed`); the coach dashboard also has a quick-actions grid.
  `student/student-help.tsx` is a dismissible "how it works" card. The landing explains both roles in 3 steps.
- **Coach Help center:** `/coach/help` (`coach/coach-help.tsx`, nav item `coachNav.help`) — a native-`<details>`
  accordion (server-friendly, RTL-aware chevron) answering every "how do I…" (add exercise+GIF, categories,
  build a program + search by category, supersets/trisets, ready-made templates, how students see programs, the
  public link, the request form, why the card number). Content is data-driven from `coachHelp.topics.<id>`
  (title/intro/`steps[]` via `t.raw`) — add a topic by extending the `TOPICS` array + both message files.
- **components/** `ui/` shadcn primitives; `shared/` (`dashboard-shell`, `public-header`, `locale-switcher`,
  `theme-toggle`, `gif-lightbox`, `error-state`, `field-error`, `json-ld`); `auth/` (`auth-form` 2-step OTP w/
  dev auto-login, `auth-guard`, `logout-button`); `coach/` (`coach-page-layout`, `coach-nav`, `getting-started`,
  `profile-form`, `exercise-library`, `program-list`, `billing-view`, `subscription-banner`,
  `download-pdf-button`, `requests-inbox`, `intake-settings`, **`program-builder/`** — the centerpiece);
  `student/` (`student-page-layout`, `student-nav`, `student-help`, `coaches-list`, `coach-programs`,
  `program-viewer`, `my-requests`); `providers/`; `pwa/`.
- **lib/api/**: `client.ts` (fetch wrapper: base URL **`''`** same-origin, `credentials:'include'`, envelope
  unwrap, **auto-refresh on 401**), per-feature modules, `upload.ts` (presigned-PUT helper), `types.ts`.
- **lib/query/**: TanStack hooks per feature. **messages/** `fa.json`/`en.json` — **all UI strings; zero
  hardcoded text.** Adding a string = add to both files + `useTranslations('namespace')`.
- **RTL:** logical Tailwind props (`ps-/pe-/ms-/me-/start-/end-`) + `rtl-flip` for directional icons.

### SEO & performance
- **`lib/site.ts`** is the single source of truth for the public origin: `SITE_URL` comes from
  **`NEXT_PUBLIC_SITE_URL`** (set it to the real domain in production — canonical URLs, sitemap, robots and OG
  tags all derive from it; fallback is `https://fitlo.ir`). It also exports `localeUrl()` and
  `languageAlternates()` (fa/en + `x-default`). **Gotcha (bit us once):** `NEXT_PUBLIC_*` is inlined at
  **build** time, so if the host's env panel doesn't set `NEXT_PUBLIC_SITE_URL` — or a stray `.env.local` in
  the deployed files supplies its dev value — the baked `SITE_URL` becomes `localhost`, and canonical/OG/JSON-LD
  ship wrong. **`sitemap.ts` + `robots.ts` are hardened against this**: they're `force-dynamic` and call
  `resolveOrigin()` (in `site.ts`), which prefers a non-localhost `SITE_URL` but otherwise derives the origin
  from the request's `x-forwarded-host`/`host` header — so a sitemap's `<loc>` entries always match the host it
  was fetched from (exactly what Search Console's "URL not allowed" check enforces). `resolveOrigin()` also
  `console.error`s once per process when it has to fall back, so a misconfigured prod deploy shows up in logs.
  Full fix for the baked tags: set the var on the host and do a **rebuild** (not just a restart), since
  `NEXT_PUBLIC_*` is frozen at build time. Base-aware helpers `localeUrlOn(base,…)` / `languageAlternatesOn(base,…)`
  build URLs against a resolved origin; the plain `localeUrl` / `languageAlternates` still use the baked `SITE_URL`
  (fine for same-request page metadata).
- **`src/app/robots.ts`** (allows public pages — with an explicit second rule block for AI answer-engine
  crawlers (GPTBot/ClaudeBot/PerplexityBot/… — GEO); disallows `/api`, coach/student panels, login, `/launch`,
  intake) and **`src/app/sitemap.ts`** (**`force-dynamic`**: landing + blog per locale with hreflang alternates
  *plus every coach `/c/<handle>` page from the DB*, soft-failing to the static list if the DB is down).
- **Favicon:** `src/app/favicon.ico` is a real multi-size (16/32/48/64) ICO generated from `public/icons/icon.svg`
  via `docker compose exec app node scripts/generate-favicon.mjs` (regenerate on rebrand). Google needs a
  crawlable root favicon to show a site icon in results; `layout.tsx` `icons` lists `/favicon.ico` (`sizes:any`)
  first, then the 192 PNG + apple-touch-icon.
- **Target keywords:** the landing carries `landing.metaTitle` / `metaDescription` / `keywords` (both locales,
  keyword-rich — برنامه تمرینی / مربی آنلاین / تمرین آنلاین / تمرینات بدنسازی / فیتنس) fed into `generateMetadata`
  (`keywords`) and the WebApplication JSON-LD (`keywords`). The hero emphasises key phrases via `subtitleRich`
  (a `t.rich` string with `<b>` → `<strong>`); the plain `subtitle` stays for any non-rich consumer.
- **Metadata:** `layout.tsx` sets `metadataBase` + defaults incl. the **1200×630 `/og.png`** card
  (regenerate via `docker compose exec app node scripts/generate-og.mjs` on rebrand), Twitter
  `summary_large_image`, and env-driven Search Console verification (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`).
  Each public page exports `generateMetadata` with locale title/description, canonical, hreflang and OG tags —
  **NB:** a page-level `openGraph` replaces the layout's whole object, so each restates `images: ['/og.png']`.
  **JSON-LD** via `components/shared/json-ld.tsx`: Organization (+sameAs socials, ContactPoint) + WebSite +
  **WebApplication with the three plan Offers** + FAQPage (landing), Article + BreadcrumbList (blog post),
  ProfilePage + Person (`/c/<handle>`).
- **GEO:** `public/llms.txt` — a plain-markdown product summary for AI answer engines; keep it in sync with
  the pricing/feature story when either changes.
- **`lib/blog.ts`** holds the posts as typed, bilingual content blocks (`p` / `h2` / `ul`) — no markdown
  dependency and nothing is `dangerouslySetInnerHTML`'d. Add a post by appending to `POSTS`; the blog index,
  static params and sitemap all pick it up automatically. Each post also has a **1200×630 hero** at
  `public/blog/<slug>.png` (`postHero(slug)`), generated by `scripts/generate-blog-heroes.mjs` — it is the
  article's LCP image (via `next/image priority`, served as ~4 KB AVIF), the post's OG image, and its Article
  JSON-LD `image`. Regenerate after adding a post (also update that script's `HEROES` list).
- **Legal pages:** `lib/legal.ts` holds the **Terms** (`/terms`) and **Privacy Policy** (`/privacy`) as the same
  typed bilingual content blocks; `components/shared/legal-article.tsx` renders both, and the two page files add
  per-doc metadata. Both are SSG + in the sitemap + linked from the footer bottom bar. Consent lines
  (`auth.consent` on the login/sign-up step, `request.consent` on the public intake form) link to them via
  `t.rich`. Bump each doc's `updated` when its substance changes — it is **product-accurate boilerplate, not
  legal advice** (have a lawyer review before relying on it).
- **Indexable public surface:** landing, blog, terms, privacy, and each coach's `/c/<handle>` page
  (server-rendered so crawlers see the content, not an empty client shell). The app panels stay out of the index.
- **Performance:** `next.config.mjs` enables `optimizePackageImports: ['lucide-react']`,
  `poweredByHeader: false`, AVIF/WebP + `minimumCacheTTL: 86400` for optimized images, and explicit
  `Cache-Control` headers (icons immutable 1y; `/og.png` 1d; `sw.js` must-revalidate; manifest 1h). Landing +
  blog are statically prerendered (SSG). Fonts: Vazirmatn preloads (fa default); Inter is `preload: false`
  since it only serves `/en`.
- **Core Web Vitals conventions** (Lighthouse-mobile driven; keep these when touching the public surface):
  - **Fonts:** Vazirmatn loads `['arabic','latin']` subsets — both are preloaded so Latin glyphs (digits,
    "fitlo") don't arrive via a late CSS-discovered fetch; fallback stack starts at `Tahoma` (closest
    Arabic-capable system metrics during the `swap` window).
  - **Provider scoping (public vs. app):** `AppProviders` (global, wraps every page) ships only the small
    public i18n subset + theme + Toaster. The authenticated segments
    (`coach/student/admin/login/layout.tsx`) wrap children in `AppSegmentProviders`
    (`components/providers/app-segment-providers.tsx`), which re-provides the **full** message catalog
    **and** `QueryProvider` (react-query, ~45 KB). react-query therefore never reaches the landing/blog/
    coach-public bundles — verified: 0 react-query hits in the landing's chunks. The `/launch` screen sits
    outside those segments but uses `useMe()`, so it has its own tiny `launch/layout.tsx` mounting just
    `QueryProvider`. **Rules when adding to a public-reachable client component:** a new
    `useTranslations('<ns>')` → add `<ns>` to `PUBLIC_CLIENT_NAMESPACES` (`src/i18n/client-messages.ts`);
    a new react-query hook on a page *outside* coach/student/admin/login/launch → that page needs a
    `QueryProvider` (both misses throw at runtime — MISSING_MESSAGE / "No QueryClient set"). Toaster is
    global because the public `/c/<handle>/request` form raises toasts.
  - **CLS:** `pwa/install-button.tsx` server-renders its button and keeps the box (`invisible` until the
    standalone check runs) instead of null-then-pop-in — don't reintroduce mount-gated header elements
    that shift layout; reserve the space instead.
  - **Legacy JS:** `package.json` `browserslist` pins modern targets (Chrome/Edge/Firefox ≥111,
    Safari ≥16.4) so SWC doesn't emit down-level transpilation helpers in the *module* bundles modern
    browsers run. (The separate ~112 KB `polyfills-*.js` chunk is loaded `nomodule` — module-capable
    browsers, incl. Lighthouse's Chrome, never fetch or run it, so it's not on anyone's critical path.)
  - **Render-blocking CSS:** `experimental.inlineCss: true` (Next's native App-Router inliner) ships the
    compiled Tailwind sheet as an inline `<style>` instead of a `<link>`. In production the CSS `<link>`
    was the *entire* LCP critical path (~2 s of chain latency — the origin has no CDN) for ~8 KB gzipped;
    inlining collapses HTML→CSS→render into one response. This is **not** `optimizeCss` (critters), which
    was tried and reverted — critters breaks app-router prerendering (`<Html> should not be imported…`).
    Trade-off: the sheet is re-embedded per HTML doc instead of cached once; worth it here for a text-LCP
    marketing surface. If the sheet ever grows large (many new global styles), re-measure.
  - `src/app/layout.tsx` (passthrough) + `src/app/not-found.tsx` (self-contained bilingual 404) exist so
    the global `/404` prerenders through the app router — required for `next build` to pass.

---

## 7. Data model (Prisma — `app/prisma/schema.prisma`)

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
- **ProgramTemplate** / **TemplateDay** / **TemplateExercise** — reusable, **student-agnostic** program
  blueprints. Same day/exercise/superset shape as Program (`TemplateExercise` carries the same
  `sets/reps/notes/order/supersetGroupId/supersetOrder`), minus the student + snapshot fields.
  `ProgramTemplate(coachId, name, description?, daysPerWeek)`. A coach authors one once and **assigns** it to
  any student — which materializes a real Program via `ProgramsService.create` (so student find-or-create,
  exercise-ownership checks and the `requestId` accept side-effect all behave identically).
- **Subscription** (`coachId`, `plan` SubscriptionPlan, `status` SubscriptionStatus, `startsAt`, `endsAt`).
- **Payment** (`coachId`, `subscriptionId?`, `gateway` PaymentGateway, `plan`, `amount` Int (minor units),
  `currency`, `status` PaymentStatus, `reference?` @@unique([gateway,reference]), `raw` Json).
- **ProgramRequest** (`coachId`, `studentUserId`, `studentProfileId?`, `fullName`, `phone?`, `age?`,
  `weightKg?`, `heightCm?`, `trainingYears?`, `trainingMonths?`, `medicalHistory?`, `daysPerWeek?`,
  `photoFrontKey?`/`photoSideKey?`/`photoBackKey?`, `receiptKey?`, `status` ProgramRequestStatus,
  `declineReason?`) — public-page intake; links a StudentProfile via `findOrCreateForProgram`. Photos/receipt
  in the **private** `requests` bucket. Coach accepts (**→ status flips to ACCEPTED only when the program is
  saved**, via `requestId` on program create) or declines with a reason the student sees.

**Enums:** `Role(COACH|STUDENT|ADMIN)`, `OtpChannel(SMS|EMAIL)`, `OtpPurpose(LOGIN|MAGIC_LINK)`,
`ProgramStatus(DRAFT|PUBLISHED)`, `SubscriptionPlan(M3|M6|M12)`,
`SubscriptionStatus(TRIALING|ACTIVE|EXPIRED|CANCELED)`, `PaymentGateway(ZARINPAL|STRIPE)`,
`PaymentStatus(PENDING|PAID|FAILED|REFUNDED)`, `ProgramRequestStatus(PENDING|ACCEPTED|DECLINED)`.

---

## 8. API surface (all under `/api`, same-origin)

- **auth** (public except /me, /set-password): `POST /auth/check` (`{exists,hasPassword}` — the login form
  branches on this), `POST /auth/login` (`{identifier,password}` → 401 `BAD_CREDENTIALS`), `POST /auth/otp/request`,
  `POST /auth/otp/verify` (returns `isNew` → new accounts are prompted to set a password),
  `POST /auth/set-password` (authed; scrypt hash), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- **coach-profile** (COACH): `GET /coach/profile`, `PATCH /coach/profile` (incl. public `handle`, card/price),
  `POST /coach/profile/avatar-upload-url`.
- **public-coach** (public): `GET /public/coaches/:handle` → public page payload.
- **categories** (COACH): `GET /coach/categories`, `POST` *(gated)*, `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*.
- **exercises** (COACH): `GET /coach/exercises?search=&categoryId=`, `POST` *(gated)*,
  `POST /coach/exercises/gif-upload-url`, `GET/:id`, `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*.
- **programs** (COACH): `GET /coach/programs`, `POST` *(gated; `requestId?` → marks that request ACCEPTED)*,
  `GET/:id`, `PATCH/:id` *(gated)*, `PATCH/:id/status` *(gated)*, `DELETE/:id` *(gated)*,
  `GET /coach/programs/:id/pdf?locale=fa|en`.
- **program-templates** (COACH): `GET /coach/program-templates?search=`, `POST` *(gated)*, `GET/:id`,
  `PATCH/:id` *(gated)*, `DELETE/:id` *(gated)*, `POST /coach/program-templates/:id/assign` *(gated)* —
  materialize a Program for `{ studentContact, name?, age?, heightCm?, weightKg?, status?, requestId? }`.
- **student** (STUDENT): `GET /student/coaches`, `GET /student/coaches/:coachId/programs`,
  `GET /student/programs/:id`, `GET /student/programs/:id/pdf?locale=` — **published-only**, ownership via
  claimed profile (drafts → 404).
- **program-requests** — student: `POST /student/requests/image-upload-url` (presigned PUT → private bucket),
  `POST /student/requests`, `GET /student/requests`. Coach: `GET /coach/requests` (inbox, presigned photo URLs
  + prefill `contact`), `PATCH /coach/requests/:id` (ACCEPTED/DECLINED; DECLINED requires `declineReason`).
- **billing** (COACH): `GET /coach/billing`, `POST /coach/billing/activate-trial` (one-time free trial, 409
  `TRIAL_ALREADY_USED` if a subscription row already exists), `POST /coach/billing/checkout`,
  `POST /coach/billing/dev/complete/:paymentId` (non-prod simulate).
- **gateway webhooks** (public): `GET /coach/billing/zarinpal/callback` (redirect),
  `POST /payments/stripe/webhook` (raw body via `req.text()`).
- **admin** (ADMIN — owner panel at `/[locale]/admin`): `GET /admin/overview` (totals, **tier distribution**
  FREE/ECONOMY/NORMAL/PRO, **growth** = new coaches/students in the trailing 7 & 30 days, revenue by currency,
  recent signups), `GET /admin/coaches?search=` (coaches + tier + **student-quota usage** `cap`/`atQuota` +
  usage counts), `POST /admin/coaches/:id/subscription` (`{tier}` — sets the coach's capability tier via
  `AdminService.setCoachTier`, normalizing the row to ACTIVE / no `endsAt` / cleared legacy `plan`),
  `GET /admin/payments` (latest 50). The old day-based `{action:'grant'|'expire'}` was removed with the tier
  migration — access is student-count scoped now, not time-scoped. **Who is admin:** phones listed in the
  `ADMIN_PHONES` env (comma-separated, normalized) — logging in with one of them creates/promotes the account
  to ADMIN (`AuthService.verifyOtp`); there is no admin signup UI. The **platform owner** account
  (`+989356995806`) is also seeded by migration `20260722020000_seed_admin_owner` (idempotent upsert: role
  ADMIN + a scrypt password hash, so it can sign in with phone+password on a fresh server) — keep that phone
  in `ADMIN_PHONES` too so login-time owner detection stays consistent.
  ADMIN accounts get no coach profile and no student claiming.
- **health:** `GET /api/health` (liveness; container healthcheck).

*(gated)* = `requiresSub: true` → 402 when trial/plan lapsed.

### Key flows
- **Auth:** the login form (`auth-form.tsx`) first calls `/auth/check`. **Known account with a password** →
  password step (`/auth/login`), with a "use a one-time code" escape hatch. **Unknown, or no password yet** →
  SMS OTP (`/auth/otp/*`); a brand-new account then lands on a **set-password** step so the next sign-in is a
  single field. Passwords are **scrypt** hashes (`utils/crypto.ts`); wrong-password and unknown-user return the
  same `BAD_CREDENTIALS` (no enumeration). SMS provider: **mock** (dev, logs the code + echoes `devCode` for
  one-click login) or **`smsir`** (production — SMS.ir Verify template API, selected by `SMS_PROVIDER=smsir` +
  `SMSIR_API_KEY`/`SMSIR_TEMPLATE_ID`). Access JWT cookie `access_token` (path `/`), opaque refresh
  `refresh_token` (path `/api/auth`, hashed in DB, rotated). First login creates the User (coach gets a starter
  profile but **no subscription yet**; student claims unlinked profiles; owner phones from `ADMIN_PHONES` → ADMIN).
- **Uploads:** client asks `*-upload-url` → presigned **PUT** URL (signed with the **public** S3 endpoint) →
  browser PUTs to MinIO → client saves the `publicUrl`. Buckets `avatars/gifs/pdfs` public-read; **`requests`**
  (intake photos) **private** — request stores object **keys**, coach inbox returns presigned GET URLs.
- **PDF:** `server/pdf/` renders an RTL HTML template with Puppeteer → uploads to `pdfs` → caches
  `Program.pdfUrl`; regenerates when `pdfStaleAt` set (every edit). `puppeteer-core` lazy-loaded
  (`webpackIgnore`); returns **503** if Chromium absent. Docker image has Chromium → renders end-to-end.
- **Subscriptions/payments:** no subscription is created at signup — the coach activates a **one-time,
  15-day free trial** themselves from the billing page (`POST /coach/billing/activate-trial` →
  `subscriptions.activateTrial`, blocked with 409 `TRIAL_ALREADY_USED` if a subscription row already exists,
  even an expired one). `subscriptions` also has `isActive`/`activateOrExtend`/hourly cron `expireDue`.
  `payments` has `PaymentProvider` + `ZarinpalProvider` (v4 REST). **ZarinPal is the only checkout gateway** —
  Stripe is disabled (allowed gateways live in `server/payments/gateways.ts`; the `StripeProvider` + webhook
  route are kept for historical `Payment` rows and easy re-enable, but no new Stripe checkout is offered). No
  ZarinPal creds → in-app **simulate** flow.

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

**Native dev (fast iteration):** `cd app && cp .env.example .env.local` (already targets 5434/9100),
`pnpm dev`. Run infra with `docker compose up -d postgres minio minio-init`.

**Prisma pinned at 5.22.0** — do not bump to v6/v7 (generation breaks here). `@prisma/client` + `prisma`
both `^5.22.0`.

**Adding a dependency:** `pnpm add <pkg>` in `app/` (host), then `docker compose build app` (or
`docker compose exec app pnpm install`) + restart.

**Windows bind-mount file watching misses NEW files.** After adding a new route file, **restart the container**
(`docker compose restart app`). `WATCHPACK_POLLING=true` mitigates but isn't perfect. Renaming/moving the
top-level `app/` directory itself can hit Windows file locks from an open editor/IDE watching it — close
editor tabs under the affected path first, or fall back to copy-then-delete instead of a plain rename.

**Schema change:** edit `app/prisma/schema.prisma` → `pnpm prisma generate`. `prisma migrate dev` needs a
TTY (fails inside Docker) → generate SQL with `prisma migrate diff --from-schema-datasource … --to-schema-
datamodel … --script`, hand-write `prisma/migrations/<ts>_<name>/migration.sql`, then `prisma migrate deploy`.

**Mock OTP in dev:** `POST /api/auth/otp/request` echoes the code as `devCode` when not production; the login
form auto-fills + submits it → one-click dev login. Never present when `NODE_ENV=production`.

**Production build inside the dev container needs `NODE_ENV=production`:** the compose app service sets
`NODE_ENV=development`, and `docker compose exec app pnpm build` under that env dies at the `/404` prerender
with `<Html> should not be imported outside of pages/_document` (dev React runtime mixed into the prod
render). Run `docker compose exec app sh -c "NODE_ENV=production pnpm build"` instead. Also note the
container's `node_modules` and `.next` are **named volumes** (`app_node_modules`, `app_next`) — they are NOT
the host directories, so verify build artifacts inside the container and install container deps with
`docker compose exec app pnpm add … --store-dir /root/.local/share/pnpm/store/v10`.

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

- `cd app && pnpm test` — **48 Jest tests** in `src/server/**/*.spec.ts` (auth/OTP, identifier + handle
  utils, exercise filter, program/superset shaping + ownership, subscription gating + activate/extend +
  activateTrial + expiry, payment flow + idempotency, PDF template). ts-jest with `tsconfig.jest.json`;
  `server-only` stubbed via `test/server-only.js`.
- `pnpm build` (= typecheck + compile, incl. spec files) and `pnpm lint` clean.
- `cd app && pnpm e2e` — **Playwright** suite in `e2e/**/*.spec.ts`, run against a live app (`docker compose
  up -d` first; `e2e/global-setup.ts` fails fast with instructions if nothing answers `/api/health`). Covers
  auth (signup/login/logout/wrong-password), the coach exercise library CRUD, the program builder + templates
  (create, publish, assign-to-student), public SEO surface (robots/sitemap/canonical+hreflang/coach JSON-LD),
  and the PWA install-prompt behavior. Selectors read copy from `src/messages/fa.json` via `e2e/helpers/
  labels.ts` so they track UI text instead of duplicating it.
  - Default browser is Playwright's managed Chromium (`npx playwright install chromium`); on machines where
    that download is blocked, `PLAYWRIGHT_CHANNEL=msedge pnpm e2e` drives the host's installed Edge instead.
  - `POST /api/auth/otp/request` is rate-limited to 5 req/60s per client IP, and every worker/test signs up
    from the same local IP — `playwright.config.ts` pins `workers: 2` and `e2e/helpers/auth.ts`'s `signUp`
    retries through a 429 rather than the suite flaking or the limiter being loosened for tests.

---

## 11. Where to look first when editing X

| Task | Start here |
|---|---|
| Add/modify an API endpoint | `src/server/<feature>/{service,schemas}.ts` + `src/app/api/<path>/route.ts` (wrap with `withRoute`) + add env to `src/server/config.ts` |
| Change a DB shape | `app/prisma/schema.prisma` → `prisma generate` + migration → update service + `src/lib/api/types.ts` |
| Add a UI string | `src/messages/{fa,en}.json` + `useTranslations` |
| New page | `src/app/[locale]/...` (+ wrap in `CoachPageLayout`/`StudentPageLayout`) |
| API call from UI | `src/lib/api/<feature>.ts` + `src/lib/query/use-<feature>.ts` |
| Auth / cookies / JWT | `src/server/auth/*`, `src/server/http/route.ts` (`getSession`, `withRoute`) |
| Uploads | `src/server/storage.ts` + `src/lib/api/upload.ts` |
| Program builder | `src/components/coach/program-builder/*` (prefill student via `?student=`, request via `?request=` on `/coach/programs/new`) |
| Program templates ("برنامه‌های آماده") | `src/server/program-templates/*` + `src/app/api/coach/program-templates/*`; UI `src/app/[locale]/coach/templates/*`, `components/coach/{template-list,assign-template-dialog}.tsx` + `components/coach/template-builder/*` (reuses program-builder sub-components + `daysToBuilderDays`); **assign** delegates to `ProgramsService.create` |
| Subscription / trial gating | `withRoute({ requiresSub: true })` + `src/server/subscriptions/*` (`activateTrial` = the coach's one-time free trial) |
| Public coach page / handle | `src/server/public-coach/*`, `src/server/utils/handle.ts`; UI `src/app/[locale]/c/[handle]/*` |
| Program requests (intake) | `src/server/program-requests/*`; UI `src/app/[locale]/c/[handle]/request`, `components/coach/requests-inbox.tsx` |
| Background cron / expiry | `src/instrumentation.ts` + `src/server/cron.ts` + `src/server/subscriptions/service.ts` |
| Payments / webhooks / trial activation | `src/server/payments/*`, `src/server/subscriptions/service.ts`; routes `src/app/api/coach/billing/*`. Month-based plan prices live in `src/server/subscriptions/plans.ts` (kept for future paid checkout); `src/lib/plans.ts` holds both that client-safe `PUBLIC_PLANS` mirror **and** the display-only student-scoped `TIERS` shown as "coming soon" on the landing (`components/shared/pricing-section.tsx`) + billing (`components/coach/billing-view.tsx`) |
| Admin / owner panel | `src/server/admin/*` + `src/app/api/admin/*`; UI `src/app/[locale]/admin/*` + `components/admin/*`; who-is-admin = `ADMIN_PHONES` env (promotion in `src/server/auth/service.ts`) |
| PWA install | `public/manifest.webmanifest` (`start_url: "/launch"`), `public/sw.js`; shared state in `src/lib/hooks/use-pwa-install.ts`. **`components/pwa/install-dialog.tsx`** is the shared modal (native `beforeinstallprompt` button when available + per-platform manual steps, iOS/Android/desktop). It's opened by: **`install-button.tsx`** (persistent header "Install app" button in `dashboard-shell` + `public-header`, hidden when standalone), the auto-prompt **`install-prompt.tsx`** (opens once per **session** when entering an app area `/coach`·`/student`·`/admin` and not installed — never on the marketing pages), and the permanent `components/shared/pwa-install-section.tsx` on the landing. `app/[locale]/launch/page.tsx` is what the **installed** app opens to — an authenticated visitor is bounced to `roleHome()`; everyone else sees a minimal coach/student picker. Installability (native prompt + SW) is production-only (`NODE_ENV=production` + HTTPS) |

Related docs: `architecture.md`, `data-model.md`, `code-structure.md`, `setup.md`, `i18n-and-rtl.md`,
`api.md`, `progress.md`, `decisions/` (ADRs).
