#!/bin/sh
# Dev entrypoint: ensure the Prisma client matches the schema, apply migrations,
# best-effort seed, then start the watcher. Best-effort steps never crash the
# container (useful during early scaffolding before migrations/seed exist).
set -e

echo "[entrypoint] Generating Prisma client..."
pnpm prisma generate

echo "[entrypoint] Applying migrations (if any)..."
pnpm prisma migrate deploy || echo "[entrypoint] migrate deploy skipped (no migrations yet)"

echo "[entrypoint] Seeding (best-effort)..."
pnpm db:seed || echo "[entrypoint] seed skipped (tables not ready yet)"

echo "[entrypoint] Starting NestJS (watch mode)..."
exec pnpm start:dev
