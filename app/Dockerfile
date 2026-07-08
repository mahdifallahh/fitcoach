# ──────────────────────────────────────────────────────────────────────────
# Single fitlo app (Next.js UI + /api Route Handlers). Multi-stage:
#   development → hot reload + migrate-on-boot (used by docker-compose)
#   production  → Next.js standalone output
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base

# ── Step 1: MANDATORY system deps ────────────────────────────────────────
# openssl + ca-certificates are required for Prisma engine detection and TLS.
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# ── Step 2: OPTIONAL – Chromium + fonts for Puppeteer PDF ───────────────
# Non-fatal: if the Debian mirror is unreachable the build still succeeds.
# PdfService loads puppeteer-core lazily and returns a 503 when Chromium is absent.
RUN printf 'Acquire::Retries "8";\nAcquire::ForceIPv4 "true";\n' \
      > /etc/apt/apt.conf.d/80-net && \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' \
      /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      chromium fonts-liberation fonts-noto-core && \
    rm -rf /var/lib/apt/lists/* || \
    { rm -rf /var/lib/apt/lists/* 2>/dev/null; \
      echo "[dockerfile] Optional Chromium/fonts not installed — PDF will degrade gracefully"; }

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN npm install -g pnpm@10
WORKDIR /app

# ── Dependencies + Prisma generate ───────────────────────────────────────
# Copy the schema here so `prisma generate` runs while network + openssl are
# reliably available; the generated client is reused in later stages.
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm prisma generate

# ── Development (used by docker-compose) ─────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]

# ── Build (produce standalone output) ────────────────────────────────────
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Production runtime ────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Standalone output bundles only what's needed to run the server.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Prisma CLI + schema/migrations so the container can run `migrate deploy` on boot.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY docker-entrypoint.prod.sh ./docker-entrypoint.prod.sh
EXPOSE 3000
CMD ["sh", "docker-entrypoint.prod.sh"]
