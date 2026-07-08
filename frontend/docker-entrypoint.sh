#!/bin/sh
# Dev entrypoint for the single Next.js app: ensure the Prisma client matches the
# schema, apply migrations, best-effort seed, then start the dev server. The
# best-effort steps never crash the container.
set -e

echo "[entrypoint] Generating Prisma client..."
pnpm prisma generate

echo "[entrypoint] Applying migrations (if any)..."
pnpm prisma migrate deploy || echo "[entrypoint] migrate deploy skipped (no migrations yet)"

echo "[entrypoint] Seeding (best-effort)..."
pnpm db:seed || echo "[entrypoint] seed skipped (already seeded or tables not ready)"

echo "[entrypoint] Starting Next.js (dev mode)..."
exec pnpm dev
