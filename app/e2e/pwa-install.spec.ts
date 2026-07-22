import { test as base, expect } from '@playwright/test';
import { L } from './helpers/labels';
import { setupCoach } from './helpers/auth';
import { INSTALL_PROMPT_SESSION_KEY } from './helpers/test';

/**
 * Deliberately uses the raw Playwright `test` (not e2e/helpers/test.ts), since
 * that fixture pre-suppresses the install prompt for every other spec — here
 * we're testing the prompt itself.
 */
const test = base;

test.describe('PWA install prompt', () => {
  test('auto-opens once per session on entering the coach panel', async ({ page }) => {
    await setupCoach(page);
    // The prompt's own 900ms timer may or may not have already fired and set
    // the session flag during signup/trial-activation navigations — clear it so
    // this test's own visit deterministically triggers a fresh auto-open.
    await page.evaluate((key) => sessionStorage.removeItem(key), INSTALL_PROMPT_SESSION_KEY);
    await page.goto('/fa/coach');
    await expect(page.getByRole('heading', { name: L.pwa.installTitle })).toBeVisible({ timeout: 5_000 });

    // Managed Playwright Chromium doesn't fire beforeinstallprompt, so the dialog
    // falls back to per-platform manual instructions rather than a native button —
    // which exact platform text depends on the project (desktop vs. mobile UA).
    const manualTexts = [L.pwa.installText, L.pwa.manualIos, L.pwa.manualAndroid, L.pwa.manualDesktop];
    const anyManualText = manualTexts.slice(1).reduce(
      (acc, t) => acc.or(page.getByText(t)),
      page.getByText(manualTexts[0]),
    );
    await expect(anyManualText).toBeVisible();

    await page.getByRole('button', { name: L.pwa.later }).click();
    await expect(page.getByRole('heading', { name: L.pwa.installTitle })).not.toBeVisible();

    // Second entry into an app area this session: the prompt must not reopen.
    await page.goto('/fa/coach/exercises');
    await page.waitForTimeout(1_500);
    await expect(page.getByRole('heading', { name: L.pwa.installTitle })).not.toBeVisible();
  });

  test('does not auto-open on the public marketing landing page', async ({ page }) => {
    await page.goto('/fa');
    await page.waitForTimeout(1_500);
    await expect(page.getByRole('heading', { name: L.pwa.installTitle })).not.toBeVisible();
  });

  test('the header install button opens the same dialog manually', async ({ page }) => {
    await page.goto('/fa');
    await page.getByRole('button', { name: L.pwa.installButton }).first().click();
    await expect(page.getByRole('heading', { name: L.pwa.installTitle })).toBeVisible();
  });
});
