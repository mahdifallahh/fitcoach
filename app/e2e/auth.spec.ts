import { test, expect } from './helpers/test';
import { L } from './helpers/labels';
import { login, logout, signUp, uniquePhone } from './helpers/auth';

test.describe('authentication', () => {
  test('a new coach can sign up, set a password, and reach the panel', async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, { phone, password: 'Passw0rd!23', role: 'coach' });

    await expect(page).toHaveURL(/\/coach(\b|\/|$)/);
    // The coach section nav is the proof we're inside the authenticated shell.
    // (The getting-started checklist also links to /coach/exercises with a longer
    // label, so match the nav link's accessible name exactly.)
    await expect(page.getByRole('link', { name: L.coachNav.exercises, exact: true })).toBeVisible();
  });

  test('an existing coach can log out and sign back in with the password', async ({ page }) => {
    const phone = uniquePhone();
    const password = 'Passw0rd!23';
    await signUp(page, { phone, password, role: 'coach' });

    await logout(page);
    await login(page, { phone, password, role: 'coach' });
    await expect(page).toHaveURL(/\/coach(\b|\/|$)/);
  });

  test('a wrong password is rejected and keeps the user on the login page', async ({ page }) => {
    const phone = uniquePhone();
    await signUp(page, { phone, password: 'Passw0rd!23', role: 'coach' });
    await logout(page);

    await page.goto(`/fa/login?role=coach`);
    await page.locator('#identifier').fill(phone);
    await page.getByRole('button', { name: L.auth.continue }).click();
    await page.locator('#password').fill('totally-wrong');
    await page.getByRole('button', { name: L.auth.signIn, exact: true }).click();

    // Error toast shows and we stay on /login (no redirect into the panel).
    await expect(page.getByText(L.auth.errorBadCredentials)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('a fresh student lands in the student panel', async ({ page }) => {
    await signUp(page, { phone: uniquePhone(), password: 'Passw0rd!23', role: 'student' });
    await expect(page).toHaveURL(/\/student(\b|\/|$)/);
  });
});
