import { type Page } from "@playwright/test";
import { L } from "./labels";

export type Role = "coach" | "student";

export function uniquePhone(): string {
  const rand = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  return `09${rand}`;
}

const roleHomeRe = (role: Role) =>
  new RegExp(`/${role === "coach" ? "coach" : "student"}(\\b|/|$)`);

export async function signUp(
  page: Page,
  { phone, password, role }: { phone: string; password: string; role: Role },
): Promise<void> {
  await page.goto(`/fa/login?role=${role}`);
  await page.locator("#identifier").fill(phone);

  const newPassword = page.locator("#new-password");
  const attempts = 4;
  for (let i = 1; i <= attempts; i++) {
    await page.getByRole("button", { name: L.auth.continue }).click();
    try {
      await newPassword.waitFor({ timeout: i === attempts ? 25_000 : 8_000 });
      break;
    } catch (err) {
      if (i === attempts) throw err;
      await page.waitForTimeout(15_000); // let the OTP-request rate-limit window clear
    }
  }
  await newPassword.fill(password);
  await page.getByRole("button", { name: L.auth.savePassword }).click();

  await page.waitForURL(roleHomeRe(role), { timeout: 25_000 });
}

/** Sign in an existing account with its password. */
export async function login(
  page: Page,
  { phone, password, role }: { phone: string; password: string; role: Role },
): Promise<void> {
  await page.goto(`/fa/login?role=${role}`);
  await page.locator("#identifier").fill(phone);
  await page.getByRole("button", { name: L.auth.continue }).click();

  const pw = page.locator("#password");
  await pw.waitFor({ timeout: 20_000 });
  await pw.fill(password);
  // Substring matching would also hit the "sign in with OTP instead" link, so
  // require an exact match on the submit button's accessible name.
  await page.getByRole("button", { name: L.auth.signIn, exact: true }).click();
  await page.waitForURL(roleHomeRe(role), { timeout: 20_000 });
}

/** Click the app-shell logout and wait until we leave the panel. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: L.dashboard.logout }).click();
  await page.waitForURL(
    (url) => !/\/(coach|student|admin)(\b|\/)/.test(url.pathname),
    { timeout: 15_000 },
  );
}

/**
 * Signup a coach → ready to create exercises/programs. Coaches are provisioned
 * with the permanent FREE plan at signup, so there's no activation step; the
 * panel is writable immediately (within the free 1-student cap).
 */
export async function setupCoach(
  page: Page,
  password = "Passw0rd!23",
): Promise<{ phone: string; password: string }> {
  const phone = uniquePhone();
  await signUp(page, { phone, password, role: "coach" });
  return { phone, password };
}
