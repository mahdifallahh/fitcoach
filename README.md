# FitCoach — Fitness Coach & Training Program Platform

A full-stack, mobile-first, **bilingual (Persian RTL / English LTR)** PWA for personal trainers and their
students. Coaches manage an exercise library and author day-by-day training programs (with supersets and
PDF export); students view the programs written for them. Coaches monetize via subscriptions (7-day trial →
3 / 6 / 12-month plans) paid through **ZarinPal** (IRR) or **Stripe** (international).

> **Defining domain rule:** a coach can author a program for a student by entering just their phone/email —
> _before that student has an account_. When the student later registers with the same phone/email, every
> program previously written for them is automatically linked to their new account.

---

## Tech Stack

| Layer          | Choice                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Frontend       | Next.js (App Router) · TypeScript · PWA · Tailwind + shadcn/ui · Framer Motion · next-intl |
| Backend        | NestJS (modular) · TypeScript · class-validator DTOs                   |
| Database       | PostgreSQL + Prisma ORM                                                |
| Cache / Queue  | Redis · BullMQ                                                         |
| Object storage | S3-compatible (AWS S3 / MinIO) via `@aws-sdk/client-s3`                |
| Payments       | ZarinPal (IRR) + Stripe (intl) behind one `PaymentProvider` interface |
| Auth           | Passwordless — phone SMS OTP + email OTP/magic-link · JWT (httpOnly)   |
| PDF            | Puppeteer (HTML → PDF, RTL-aware)                                      |
| Containers     | Docker multi-stage builds + docker-compose                            |

See [`docs/`](./docs) for architecture, data model, decisions (ADRs), and the live implementation progress.

---

## Quick Start (Docker — recommended)

```bash
cp .env.example .env          # adjust secrets if you like; defaults work for local
docker compose up --build
```

| Service        | URL                                            |
| -------------- | ---------------------------------------------- |
| Frontend (PWA) | http://localhost:3000                          |
| Backend API    | http://localhost:4000/api                      |
| API docs       | http://localhost:4000/api/docs (Swagger)       |
| MinIO console  | http://localhost:9001 (minioadmin / minioadmin)|

On first boot the backend runs Prisma migrations and seeds demo data automatically.

## Local Development (without Docker)

You still need Postgres, Redis, and MinIO running (the easiest way is
`docker compose up postgres redis minio minio-init`). Then:

```bash
# Backend
cd backend && pnpm install && pnpm prisma migrate dev && pnpm start:dev

# Frontend (new terminal)
cd frontend && pnpm install && pnpm dev
```

Point `backend/.env` and `frontend/.env.local` at `localhost` instead of the compose service names
(see each app's `.env.example`).

---

## Repository Layout

```
.
├── backend/      NestJS API (feature modules, Prisma, BullMQ workers)
├── frontend/     Next.js App-Router PWA (locale routing, shadcn UI)
├── docs/         Architecture, data model, ADRs, progress tracker
├── docker-compose.yml
└── .env.example
```

## Testing

```bash
cd backend && pnpm test        # auth, subscription gating, payments, student linking
```

## Environment Variables

Every variable is documented in [`.env.example`](./.env.example) (root/compose),
[`backend/.env.example`](./backend/.env.example), and [`frontend/.env.example`](./frontend/.env.example).
