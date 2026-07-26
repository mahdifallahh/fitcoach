import { test, expect } from './helpers/test';
import { L } from './helpers/labels';
import { setupCoach } from './helpers/auth';

/**
 * The panel header is the one piece of chrome on every authenticated screen, and
 * it regressed before: five controls (two with text labels) wrapped on phones and
 * squeezed the brand lockup. These lock in the fix — one brand + one profile
 * trigger, no horizontal overflow at a small viewport.
 */
test.describe('panel header on mobile', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('fits a 360px viewport without horizontal overflow', async ({ page }) => {
    await setupCoach(page);
    await page.goto('/fa/coach');

    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement!;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // The header row itself must not wrap onto a second line.
    const header = page.locator('header').first();
    expect((await header.boundingBox())!.height).toBeLessThan(80);
  });

  test('the logo keeps its full size next to the profile button', async ({ page }) => {
    await setupCoach(page);
    await page.goto('/fa/coach');

    // The brand lockup is the mark + wordmark; `shrink-0` must keep it intact.
    const logo = page.locator('header a[aria-label="fitlo"] img').first();
    const box = (await logo.boundingBox())!;
    expect(box.width).toBeGreaterThan(20);
    expect(box.height).toBeGreaterThan(20);
  });

  test('the profile menu holds the account actions that used to crowd the header', async ({ page }) => {
    await setupCoach(page);
    await page.goto('/fa/coach');

    await page.getByRole('button', { name: L.profileMenu.open }).click();

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // Mode switch + preferences + sign-out all live here now.
    await expect(menu.getByText(L.roleSwitcher.mode_COACH, { exact: true })).toBeVisible();
    await expect(menu.getByText(L.roleSwitcher.mode_STUDENT, { exact: true })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: L.profileMenu.logout })).toBeVisible();

    // Escape closes it (the dismissable-popover contract).
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  });
});
