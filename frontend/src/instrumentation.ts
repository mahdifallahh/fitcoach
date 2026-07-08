/**
 * Next.js runs `register()` once when the server process starts. This file is
 * compiled for *every* runtime (the next-intl middleware forces an Edge build),
 * so the node-only cron import must sit inside a `=== 'nodejs'` branch: webpack
 * inlines `process.env.NEXT_RUNTIME` per build and dead-code-eliminates the
 * branch (and its `node:crypto`/Prisma graph) from the Edge bundle.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCron } = await import('@/server/cron');
    startCron();
  }
}
