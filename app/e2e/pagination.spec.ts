import { test, expect } from './helpers/test';
import { L } from './helpers/labels';
import { setupCoach } from './helpers/auth';

/** Default server page size (`DEFAULT_PAGE_SIZE` in server/http/pagination.ts). */
const PAGE_SIZE = 20;

test.describe('exercise library pagination', () => {
  test('pages through a library larger than one page, and search resets to page 1', async ({
    page,
  }) => {
    await setupCoach(page);

    // 23 exercises → 2 pages. Named so the last-created sorts first (desc).
    const total = 23;
    for (let i = 1; i <= total; i++) {
      await page.request.post('/api/coach/exercises', { data: { name: `تمرین ${i}` } });
    }

    await page.goto('/fa/coach/exercises');

    const cards = page.locator('.overflow-hidden').filter({ hasText: 'تمرین' });
    await expect(cards).toHaveCount(PAGE_SIZE);

    // Page 2 holds the remainder.
    await page.getByRole('button', { name: L.pagination.next }).click();
    await expect(cards).toHaveCount(total - PAGE_SIZE);

    // Going back restores a full page.
    await page.getByRole('button', { name: L.pagination.previous }).click();
    await expect(cards).toHaveCount(PAGE_SIZE);

    // Searching while on page 2 must not strand the user on an out-of-range page
    // — the list resets to page 1 of the new, shorter result set.
    await page.getByRole('button', { name: L.pagination.next }).click();
    await expect(cards).toHaveCount(total - PAGE_SIZE);
    await page.getByPlaceholder(L.exercises.search).fill('تمرین 7');
    await expect(cards).toHaveCount(1);
  });

  test('no pager is rendered when everything fits on one page', async ({ page }) => {
    await setupCoach(page);
    await page.request.post('/api/coach/exercises', { data: { name: 'تک تمرین' } });

    await page.goto('/fa/coach/exercises');
    await expect(page.getByText('تک تمرین')).toBeVisible();
    await expect(page.getByRole('button', { name: L.pagination.next })).toHaveCount(0);
  });
});
