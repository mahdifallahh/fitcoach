# ──────────────────────────────────────────────────────────────────────────
# Backend multi-stage Dockerfile.
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base

# ── Step 1: MANDATORY system deps ────────────────────────────────────────
# openssl + ca-certificates are required for Prisma engine detection and TLS.
# This step must succeed; it does not pull large optional packages.
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
# Copy the schema here so `prisma generate` can run while network + openssl
# are reliably available. The generated client is then reused in later stages.
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
# Prisma client already generated in deps stage — no re-download needed.
EXPOSE 4000
CMD ["sh", "docker-entrypoint.sh"]

# ── Build (compile TypeScript) ────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Production runtime ────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
