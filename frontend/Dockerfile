# ──────────────────────────────────────────────────────────────────────────
# Frontend multi-stage Dockerfile.
# Targets: development (hot reload) and production (Next.js standalone output).
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
RUN npm install -g pnpm@10
WORKDIR /app

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ── Development (used by docker-compose) ─────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# ── Build (produce standalone output) ────────────────────────────────────────
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Production runtime ───────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Standalone output bundles only what's needed to run.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
