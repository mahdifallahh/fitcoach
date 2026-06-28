# Setup & Operations

## Prerequisites
- Docker + Docker Compose (recommended path), **or**
- Node 20 LTS + pnpm 10, plus Postgres 16, Redis 7, and MinIO if running natively.

## Run everything with Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts: `postgres`, `redis`, `minio` (+ `minio-init` which creates the buckets), `backend`, `frontend`.
The backend container runs Prisma migrations and the seed on first start.

| What | Where |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| Swagger | http://localhost:4000/api/docs |
| Health (backend) | http://localhost:4000/api/health |
| Health (frontend) | http://localhost:3000/api/health |
| MinIO console | http://localhost:9001 |

Stop with `docker compose down` (add `-v` to wipe volumes/data).

## Run only infra in Docker, apps on host

```bash
docker compose up -d postgres redis minio minio-init

# Backend
cd backend
cp .env.example .env          # set DATABASE_URL/REDIS_URL/S3_ENDPOINT to localhost
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm start:dev

# Frontend (new terminal)
cd frontend
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL=http://localhost:4000
pnpm install
pnpm dev
```

## Common tasks

| Task | Command (in `backend/`) |
| --- | --- |
| Create a migration | `pnpm prisma migrate dev --name <change>` |
| Apply migrations (prod) | `pnpm prisma migrate deploy` |
| Open Prisma Studio | `pnpm prisma studio` |
| Re-seed | `pnpm prisma db seed` |
| Run tests | `pnpm test` |
| Lint | `pnpm lint` |

## Environment variables
All variables are documented inline in:
- [`/.env.example`](../.env.example) — compose-level (also feeds containers)
- [`/backend/.env.example`](../backend/.env.example)
- [`/frontend/.env.example`](../frontend/.env.example)

## Troubleshooting

### Host port already in use (local Postgres/Redis/MinIO)
If you already run Postgres (5432), Redis (6379), or MinIO (9000/9001) natively, the compose
host-port mappings collide and **host-side** tools (e.g. `pnpm prisma migrate` run on your machine)
may connect to the wrong server (symptom: `P1000 Authentication failed`).

This does **not** affect the Docker stack itself — inside the compose network services reach each
other by name (`postgres:5432`, `redis:6379`, `minio:9000`), so `docker compose up` works regardless.
Two ways to do host-side DB work:

- **Run Prisma inside the backend container** (recommended):
  `docker compose exec backend pnpm prisma migrate deploy` / `... pnpm db:seed`.
- **Remap host ports**: in your local `.env` set e.g. `POSTGRES_PORT=5433`, `REDIS_PORT=6380`,
  `MINIO_API_PORT=9100`, `MINIO_CONSOLE_PORT=9101`, recreate (`docker compose up -d`), and point
  `backend/.env` at the new `localhost` ports.

### Windows: `next build` EPERM symlink error
`output: 'standalone'` is enabled only when `NEXT_OUTPUT=standalone` (set in the frontend Dockerfile),
because standalone tracing uses symlinks that need elevated privileges on Windows. Local `pnpm build`
and `pnpm dev` work without it.

### Switching providers (prod)
- **SMS:** set `SMS_PROVIDER` to your vendor key and fill `SMS_API_KEY`/`SMS_SENDER`. The dev default
  `mock` logs OTP codes to the backend console.
- **Email:** set `EMAIL_PROVIDER` and SMTP creds; `mock` logs magic links/codes.
- **Payments:** fill `ZARINPAL_MERCHANT_ID` (set `ZARINPAL_SANDBOX=false` for live) and/or
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- **Object storage:** point `S3_ENDPOINT`/keys at AWS S3 instead of MinIO — no code change needed
  (`S3_FORCE_PATH_STYLE=false` for AWS).
