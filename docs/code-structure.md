# Code Structure & Conventions

## Backend (NestJS)

```
backend/src/
├── main.ts                 Bootstrap: pipes, filters, interceptors, cookies, CORS, Swagger
├── app.module.ts           Root module wiring all feature modules
├── config/
│   ├── env.validation.ts   Zod schema for process.env
│   └── config.module.ts    Global ConfigModule + typed AppConfigService
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts   Extends PrismaClient, hooks onModuleInit/onModuleDestroy
├── common/
│   ├── filters/            all-exceptions.filter.ts
│   ├── interceptors/       response.interceptor.ts (envelope)
│   ├── guards/             jwt-auth.guard.ts, roles.guard.ts, subscription.guard.ts
│   ├── decorators/         current-user.ts, roles.ts, requires-active-subscription.ts, public.ts
│   └── dto/                pagination.dto.ts, api-response shapes
└── modules/
    └── <feature>/
        ├── <feature>.module.ts
        ├── <feature>.controller.ts
        ├── <feature>.service.ts
        ├── dto/            create/update/query DTOs (class-validator)
        └── entities/       response/view models where useful
```

**Rules**
- One feature = one module. No cross-module imports of services except via the module's exported provider.
- Controllers are thin: validate (DTO) → delegate to service → return data. The interceptor wraps the envelope.
- Services contain business logic; database access through `PrismaService` (or a thin repository when a
  query is reused widely).
- All env access via `AppConfigService` — never `process.env` outside `config/`.
- Throw `HttpException` subclasses (or domain errors mapped in the filter); never return raw error objects.

## Frontend (Next.js App Router)

```
frontend/src/
├── app/[locale]/
│   ├── layout.tsx          Root layout: dir, font, providers (theme, query, intl)
│   ├── (auth)/             login, verify
│   ├── coach/              dashboard, profile, exercises, programs, billing
│   ├── student/            coaches, programs, program viewer
│   └── api/health/route.ts Frontend liveness for compose healthcheck
├── components/
│   ├── ui/                 shadcn primitives (button, dialog, input, ...)
│   ├── shared/             Navbar, ThemeToggle, LocaleSwitcher, EmptyState, Skeletons
│   ├── coach/              ProgramBuilder, ExercisePicker, SupersetGroup, ...
│   └── student/            ProgramViewer, CoachCard, ...
├── lib/
│   ├── api/                client.ts (fetch wrapper) + resource modules
│   ├── query/              query-client.ts + hooks (use-exercises, use-programs, ...)
│   ├── auth/               session helpers
│   ├── schemas/            zod schemas (shared by forms)
│   └── utils.ts            cn(), formatters
├── messages/               fa.json, en.json
├── i18n/                   routing.ts, request.ts
└── public/                 manifest.webmanifest, icons, offline page assets
```

**Rules**
- No hardcoded user-facing strings — always `useTranslations()` / `getTranslations()` keys in `messages/`.
- Presentation never calls `fetch`; it uses hooks from `lib/query` that wrap `lib/api`.
- Use logical CSS (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) and Tailwind RTL so layouts mirror — never
  hardcode `left/right` for directional spacing.
- Server Components for data the page needs on first paint; Client Components for interactivity (forms,
  builder, toggles). Mark client files with `"use client"`.

## Naming & style
- TypeScript strict; no `any` without a justification comment.
- Files: kebab-case. React components: PascalCase. Hooks: `useThing`. DTOs: `CreateThingDto`.
- Keep functions small and single-purpose; colocate types with usage; export shared types from a `types.ts`.
