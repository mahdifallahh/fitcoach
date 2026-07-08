# Setup & Operations

## Prerequisites
- Docker + Docker Compose (recommended path), **or**
- Node 20 LTS + pnpm 10, plus Postgres 16 and MinIO if running natively.

## Run everything with Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts: `postgres`, `minio` (+ `minio-init` which creates the buckets), and the single `app` service
(Next.js UI + `/api` Route Handlers). The container applies Prisma migrations and the seed on first boot.

| What | Where |
| --- | --- |
| App (UI + API) | http://localhost:3000 (default locale `/fa`) |
| API | http://localhost:3000/api |
| Health | http://localhost:3000/api/health |
| MinIO console | http://localhost:9101 |

Stop with `docker compose down` (add `-v` to wipe volumes/data).

## Run only infra in Docker, the app on host

```bash
docker compose up -d postgres minio minio-init

cd app
cp .env.example .env.local     # already targets the host-published infra ports
pnpm install
pnpm prisma migrate deploy
pnpm dev
```

## Common tasks

| Task | Command (in `app/`) |
| --- | --- |
| Create a migration | `prisma migrate dev` needs a TTY (fails in Docker) — see contextProject.md §9 for the `migrate diff --script` workaround |
| Apply migrations (prod) | `pnpm prisma:migrate` (`prisma migrate deploy`) |
| Regenerate the Prisma client | `pnpm prisma:generate` |
| Open Prisma Studio | `pnpm prisma studio` |
| Re-seed | `pnpm db:seed` |
| Run tests | `pnpm test` |
| Lint | `pnpm lint` |

## Environment variables
All variables are documented inline in:
- [`/.env.example`](../.env.example) — compose-level (also feeds the container)
- [`/app/.env.example`](../app/.env.example) — native dev

## Troubleshooting

### Host port already in use (local Postgres/MinIO)
If you already run Postgres (5432) or MinIO (9000/9001) natively, the compose host-port mappings collide
and **host-side** tools (e.g. `pnpm prisma migrate` run on your machine) may connect to the wrong server
(symptom: `P1000 Authentication failed`).

This does **not** affect the Docker stack itself — inside the compose network the app reaches infra by
service name (`postgres:5432`, `minio:9000`), so `docker compose up` works regardless. Two ways to do
host-side DB work:

- **Run Prisma inside the app container** (recommended):
  `docker compose exec app pnpm prisma migrate deploy` / `... pnpm db:seed`.
- **Remap host ports**: in your local `.env` set e.g. `POSTGRES_PORT=5434`, `MINIO_API_PORT=9100`,
  `MINIO_CONSOLE_PORT=9101`, recreate (`docker compose up -d`), and point `app/.env.local` at the new
  `localhost` ports.

### Windows: `next build` EPERM symlink error
`output: 'standalone'` is enabled only when `NEXT_OUTPUT=standalone` (set in the app's Dockerfile), because
standalone tracing uses symlinks that need elevated privileges on Windows. Local `pnpm build` and `pnpm dev`
work without it.

### Windows: renaming/moving the app directory hits "Permission denied"
An open editor/IDE watching files under `app/` (TypeScript server, file watchers) can hold handles that
block a plain directory rename, even after stopping Docker. If a rename fails, copy the directory to the
new location instead (`cp -r`), then delete the original — deletion often succeeds even when rename doesn't.

### Switching providers (prod)
- **SMS:** set `SMS_PROVIDER` to your vendor key and fill `SMS_API_KEY`/`SMS_SENDER`. The dev default
  `mock` logs OTP codes to the console (and echoes `devCode` in the API response).
- **Email:** set `EMAIL_PROVIDER` and SMTP creds; `mock` logs codes.
- **Payments:** fill `ZARINPAL_MERCHANT_ID` (set `ZARINPAL_SANDBOX=false` for live) and/or
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- **Object storage:** point `S3_ENDPOINT`/keys at AWS S3 instead of MinIO — no code change needed
  (`S3_FORCE_PATH_STYLE=false` for AWS).
