import { expect, type Page } from '@playwright/test';
import { L } from './labels';

export type Role = 'coach' | 'student';

/**
 * A unique, valid-looking Iranian mobile per call, so every test gets a fresh
 * account and specs stay independent / parallel-safe. `09` + 9 random digits.
 */
export function uniquePhone(): string {
  const rand = String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  return `09${rand}`;
}

const roleHomeRe = (role: Role) => new RegExp(`/${role === 'coach' ? 'coach' : 'student'}(\\b|/|$)`);

/**
 * Sign up a brand-new account. In non-production the OTP is echoed back and the
 * form auto-submits it, so signup collapses to: enter phone → set a password →
 * land in the panel. Returns nothing; asserts we reached the role home.
 *
 * POST /api/auth/otp/request is genuinely rate-limited (5 req/60s per client IP
 * — src/server/http/rate-limit.ts), and every signup in this suite shares one
 * IP. Rather than loosen that real anti-abuse control for tests, retry: if the
 * "continue" click 429s, the phone step just sits there (no #new-password), so
 * wait out the window and click continue again.
 */
export async function signUp(
  page: Page,
  { phone, password, role }: { phone: string; password: string; role: Role },
): Promise<void> {
  await page.goto(`/fa/login?role=${role}`);
  await page.locator('#identifier').fill(phone);

  const newPassword = page.locator('#new-password');
  const attempts = 4;
  for (let i = 1; i <= attempts; i++) {
    await page.getByRole('button', { name: L.auth.continue }).click();
    try {
      await newPassword.waitFor({ timeout: i === attempts ? 25_000 : 8_000 });
      break;
    } catch (err) {
      if (i === attempts) throw err;
      await page.waitForTimeout(15_000); // let the OTP-request rate-limit window clear
    }
  }
  await newPassword.fill(password);
  await page.getByRole('button', { name: L.auth.savePassword }).click();

  await page.waitForURL(roleHomeRe(role), { timeout: 25_000 });
}

/** Sign in an existing account with its password. */
export async function login(
  page: Page,
  { phone, password, role }: { phone: string; password: string; role: Role },
): Promise<void> {
  await page.goto(`/fa/login?role=${role}`);
  await page.locator('#identifier').fill(phone);
  await page.getByRole('button', { name: L.auth.continue }).click();

  const pw = page.locator('#password');
  await pw.waitFor({ timeout: 20_000 });
  await pw.fill(password);
  // Substring matching would also hit the "sign in with OTP instead" link, so
  // require an exact match on the submit button's accessible name.
  await page.getByRole('button', { name: L.auth.signIn, exact: true }).click();
  await page.waitForURL(roleHomeRe(role), { timeout: 20_000 });
}

/** Click the app-shell logout and wait until we leave the panel. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: L.dashboard.logout }).click();
  await page.waitForURL((url) => !/\/(coach|student|admin)(\b|\/)/.test(url.pathname), { timeout: 15_000 });
}

/**
 * Activate the one-time free trial via the API (fast, deterministic setup step
 * — not the thing under test). Uses the page's session cookie, then reloads so
 * `useMe()` picks up the new subscription and write-gated UI unlocks.
 */
export async function activateTrial(page: Page): Promise<void> {
  const res = await page.request.post('/api/coach/billing/activate-trial');
  expect(res.ok(), `activate-trial failed: ${res.status()}`).toBeTruthy();
  await page.reload();
}

/** Signup a coach + activate the trial → ready to create exercises/programs. */
export async function setupCoachWithTrial(
  page: Page,
  password = 'Passw0rd!23',
): Promise<{ phone: string; password: string }> {
  const phone = uniquePhone();
  await signUp(page, { phone, password, role: 'coach' });
  await activateTrial(page);
  return { phone, password };
}
