import type { FullConfig } from '@playwright/test';

/**
 * The suite runs against a live app (Docker: app + Postgres + MinIO). Rather than
 * let every test fail with a confusing connection error, probe health once and
 * print exactly what to do if nothing is listening.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  const health = `${baseURL}/api/health`;
  try {
    const res = await fetch(health);
    if (!res.ok) throw new Error(`health ${res.status}`);
  } catch (err) {
    throw new Error(
      `\n\n[e2e] The app isn't reachable at ${baseURL} (${health} failed: ${
        (err as Error).message
      }).\n` +
        `Start it first:  docker compose up -d\n` +
        `Or point the suite elsewhere:  E2E_BASE_URL=https://staging.example.com pnpm e2e\n`,
    );
  }
}
