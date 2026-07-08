#!/bin/sh
# Production entrypoint: apply migrations, then start the standalone server.
set -e

echo "[entrypoint] Applying migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Starting Next.js server..."
exec node server.js
