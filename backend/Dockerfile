# ──────────────────────────────────────────────────────────────────────────
# Backend multi-stage Dockerfile.
# Debian slim base: Prisma engines + (later) Puppeteer/Chromium work cleanly here.
# Targets: development (hot reload) and production (slim runtime).
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
# openssl/ca-certificates: Prisma + TLS · chromium + fonts: Puppeteer PDF (incl. Persian/Arabic shaping)
# HTTPS mirror (port 443) + IPv4 + retries, and update+install retried as one
# unit so a partial package index (flaky CDN) triggers a full retry rather than
# an "Unable to locate package" failure.
# Best-effort: never fails the build if the Debian mirror is down — Chromium is
# optional (PdfService loads puppeteer-core lazily and degrades gracefully), and
# Prisma uses libssl from the base image. Rebuild when the mirror is reachable to
# bake Chromium + Persian fonts in.
RUN printf 'Acquire::Retries "8";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/80-net; \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true; \
    for i in 1 2 3 4 5; do \
      apt-get update && apt-get install -y --no-install-recommends \
        openssl ca-certificates curl chromium fonts-liberation fonts-noto-core && break; \
      echo "apt attempt $i failed; retrying..."; sleep 8; \
    done; \
    rm -rf /var/lib/apt/lists/* 2>/dev/null || true
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN npm install -g pnpm@10
WORKDIR /app

# ── Dependencies (full, incl. dev) ───────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ── Development (used by docker-compose) ─────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
EXPOSE 4000
CMD ["sh", "docker-entrypoint.sh"]

# ── Build (compile + prune to prod deps) ─────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

# ── Production runtime ───────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
