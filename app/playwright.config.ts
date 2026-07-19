import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Tests run against an already-running app (the Docker stack — they
 * need Postgres + MinIO), so there's no `webServer`; `global-setup.ts` fails fast
 * with a clear message if nothing is listening on `baseURL`.
 *
 * Browser: defaults to Playwright's managed Chromium (deterministic for CI,
 * after `npx playwright install chromium`). Set `PLAYWRIGHT_CHANNEL=msedge` to
 * drive the host's installed Edge instead — handy on dev machines without the
 * downloaded browsers. The mobile project runs a Pixel-5 viewport so the
 * mobile-first UI is actually exercised on touch + small-screen.
 */
const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  // Persian is the default locale; drive the fa (RTL) UI, the primary experience.
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Every signup triggers a real POST /api/auth/otp/request, and that route is
  // rate-limited to 5 req/60s per client IP (src/server/http/rate-limit.ts) — a
  // real anti-abuse control we don't bypass for tests. All workers hit the app
  // from the same local IP, so high parallelism here means 429s, not app bugs.
  workers: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: 'fa-IR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Video needs Playwright's ffmpeg binary, which isn't downloadable on every
    // network. Traces + screenshots already cover debugging, so keep video
    // opt-in (PW_VIDEO=1) rather than letting a missing binary fail the run.
    video: process.env.PW_VIDEO ? 'retain-on-failure' : 'off',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 5'], channel } },
  ],
});
