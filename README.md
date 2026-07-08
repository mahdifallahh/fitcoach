# fitlo — Fitness Coach & Training Program Platform

A full-stack, mobile-first, **bilingual (Persian RTL / English LTR)** PWA for personal trainers and their
students. Coaches manage an exercise library and author day-by-day training programs (with supersets and
PDF export); students view the programs written for them. Coaches monetize via subscriptions (a
coach-activated, one-time 15-day free trial → 3 / 6 / 12-month plans) paid through **ZarinPal** (IRR) or
**Stripe** (international). Each coach also gets a public link-in-bio page (`/c/<handle>`) where prospective
students submit an intake request.

> **Defining domain rule:** a coach can author a program for a student by entering just their phone —
> _before that student has an account_. When the student later registers with the same phone, every program
> previously written for them is automatically linked to their new account.

It is a **single Next.js app**: the UI *and* the REST API (Route Handlers under `/api`) run in one process.

---

## Tech Stack

| Layer          | Choice                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| App            | Next.js 15 (App Router) · TypeScript · PWA · Tailwind + shadcn/ui · next-intl |
| API            | Next.js Route Handlers (`src/app/api/**`) · plain service classes (`src/server`) · Zod |
| Database       | PostgreSQL + Prisma ORM (5.22.0)                                              |
| Object storage | S3-compatible (AWS S3 / MinIO) via `@aws-sdk/client-s3`                       |
| Payments       | ZarinPal (IRR) + Stripe (intl) behind one `PaymentProvider` interface        |
| Auth           | Passwordless — phone SMS OTP · JWT (httpOnly cookies, `jose`)                |
| PDF            | Puppeteer (HTML → PDF, RTL-aware)                                            |
| Scheduling     | `node-cron` (hourly subscription-expiry sweep)                              |
| Containers     | Docker multi-stage build + docker-compose                                    |

See [`docs/`](./docs) — start with [`docs/contextProject.md`](./docs/contextProject.md).

---

## Quick Start (Docker — recommended)

```bash
cp .env.example .env          # defaults work for local
docker compose up --build
```

| Service        | URL                                             |
| -------------- | ----------------------------------------------- |
| App (UI + API) | http://localhost:3000 (default locale `/fa`)    |
| API            | http://localhost:3000/api                       |
| MinIO console  | http://localhost:9101 (minioadmin / minioadmin) |

On first boot the container applies Prisma migrations and seeds demo data automatically. In non-production
the login form auto-fills the OTP (`devCode`), so signing in is a single click.

## Local Development (without Docker)

Run just the infra in Docker, then the app on the host:

```bash
docker compose up -d postgres minio minio-init

cd app
cp .env.example .env.local     # already points at the host-published infra ports
pnpm install
pnpm prisma migrate deploy
pnpm dev
```

---

## Repository Layout

```
.
├── app/          the single Next.js app (UI + /api Route Handlers, Prisma, PDF, cron)
│   ├── src/server/   ported API services, http helpers, auth, container
│   ├── src/app/      [locale]/ UI  +  api/**/route.ts
│   └── prisma/       schema, migrations, seed
├── docs/         architecture, data model, ADRs, progress tracker
├── docker-compose.yml
└── .env.example
```

## Testing

```bash
cd app && pnpm test            # 48 Jest tests (auth/OTP, gating, payments, linking, PDF, utils)
pnpm build                     # also the typecheck step
pnpm lint
```

## Environment Variables

Every variable is documented in [`.env.example`](./.env.example) (root/compose) and
[`app/.env.example`](./app/.env.example) (native dev).
