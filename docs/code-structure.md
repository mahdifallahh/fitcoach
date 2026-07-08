# Code Structure & Conventions

The whole app lives in `app/` — one Next.js project serving both the UI and the API. See
`docs/contextProject.md` §4/§6 for the authoritative, up-to-date map; this file covers conventions.

## Server layer (`app/src/server`)

```
app/src/server/
├── config.ts                 Zod-validated env (lazy), AppConfig.get(key) + isProduction
├── prisma.ts / storage.ts / notifications.ts   shared singletons
├── container.ts              getPrisma(), getStorage(), getPrograms(), getPayments(), ... (lazy singletons)
├── cron.ts                   hourly subscription-expiry sweep (started from src/instrumentation.ts)
├── http/
│   ├── errors.ts             AppError + Nest-compatible shims (NotFoundException, BadRequestException, ...)
│   ├── envelope.ts           ok(data) / mapError(err) → the { success, data|error } envelope
│   ├── route.ts              withRoute(handler, { role?, requiresSub?, public?, bodySchema? })
│   ├── rate-limit.ts         in-memory fixed-window limiter (auth/otp)
│   └── upload.ts             shared image-upload Zod schema
├── auth/                     tokens.ts (jose JWT + cookies), otp.ts, session.ts, service.ts
├── utils/                    identifier.ts, crypto.ts, handle.ts
└── <feature>/                service.ts (+ schemas.ts Zod DTOs, service.spec.ts) per feature:
                               users, coach-profile, categories, exercises, students, programs,
                               public-coach, program-requests, subscriptions, payments, pdf
```

**Rules**
- One feature = one folder under `server/`. Services are plain classes with constructor-injected
  dependencies (Prisma client, other services) — wired once in `container.ts`, not re-instantiated per request.
- Route handlers (`app/src/app/api/**/route.ts`) are thin: parse params, call a service getter from
  `@/server/container`, return data. All gating (`role`, `requiresSub`, body validation) happens via the
  `withRoute` options, not inline in the handler.
- Ownership is always enforced in the service (`where: { id, coachId }`), never assumed from the route.
- Throw the `http/errors.ts` shims (`{ code, message, details? }`); never return raw error objects or throw
  plain `Error`. Use `isAppError()` (not `instanceof AppError`) if you need to inspect a caught error — Next
  dev can evaluate `errors.ts` in more than one bundle.
- All env access via `config.ts`'s `getConfig()` — never `process.env` directly outside that file.

## UI layer (`app/src`)

```
app/src/
├── app/
│   ├── [locale]/            layout.tsx (dir/font/providers), (auth)/, coach/, student/, c/[handle]/
│   └── api/**/route.ts      one folder per endpoint, mirrors docs/contextProject.md §8
├── components/
│   ├── ui/                  shadcn primitives (button, dialog, input, ...)
│   ├── shared/               dashboard-shell, locale-switcher, theme-toggle, gif-lightbox
│   ├── auth/                 auth-form, auth-guard, logout-button
│   ├── coach/                profile-form, exercise-library, program-builder/, billing-view, ...
│   └── student/              student-page-layout, coaches-list, program-viewer, ...
├── lib/
│   ├── api/                  client.ts (fetch wrapper, same-origin) + one module per feature
│   ├── query/                TanStack Query hooks, one per feature
│   └── utils.ts               cn(), formatters
├── messages/                  fa.json, en.json
└── i18n/                      routing.ts, request.ts
```

**Rules**
- No hardcoded user-facing strings — always `useTranslations()` / `getTranslations()` keys in `messages/`.
  Add new copy to **both** `fa.json` and `en.json`.
- Presentation never calls `fetch`; it uses hooks from `lib/query` that wrap `lib/api`.
- Use logical CSS (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) and Tailwind RTL so layouts mirror — never
  hardcode `left/right` for directional spacing.
- Always import navigation (`Link`, `useRouter`, `usePathname`) from `@/i18n/routing`, not `next/link` /
  `next/navigation` (locale-aware routing needs the wrapper).
- Server Components for data the page needs on first paint; Client Components for interactivity (forms,
  builder, toggles). Mark client files with `"use client"`.

## Naming & style
- TypeScript strict; no `any` without a justification comment.
- Files: kebab-case. React components: PascalCase. Hooks: `useThing`. Zod schemas: `createThingSchema` →
  `CreateThingDto = z.infer<...>`.
- Keep functions small and single-purpose; colocate types with usage; export shared types from a `types.ts`.
