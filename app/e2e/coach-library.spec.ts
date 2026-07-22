import { test, expect } from './helpers/test';
import { L } from './helpers/labels';
import { setupCoach } from './helpers/auth';

/**
 * Exercise library CRUD. Every test signs up its own coach (via setupCoach)
 * so exercises never leak between tests / parallel workers.
 */
test.describe('coach exercise library', () => {
  test('a coach can create, find, edit, and delete an exercise', async ({ page }) => {
    await setupCoach(page);
    await page.goto('/fa/coach/exercises');

    const name = `پرس سینه ${Date.now()}`;
    await page.getByRole('button', { name: L.exercises.new }).click();
    await page.locator('#ex-name').fill(name);
    await page.locator('#ex-sets').fill('4');
    await page.locator('#ex-reps').fill('۸-۱۲');
    await page.getByRole('button', { name: L.exercises.create }).click();
    await expect(page.getByText(L.exercises.created)).toBeVisible();

    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Search narrows the grid down to the exercise we just made.
    await page.getByPlaceholder(L.exercises.search).fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // The edit/delete buttons on the card are icon-only (no accessible name),
    // so scope to the card by its class + the exercise name and use DOM order:
    // edit (Pencil) renders before delete (Trash2).
    const card = page.locator('.overflow-hidden', { hasText: name });
    const editBtn = card.locator('button').nth(0);

    const updatedName = `${name} (ویرایش‌شده)`;
    await editBtn.click();
    await page.locator('#ex-name').fill(updatedName);
    await page.getByRole('button', { name: L.exercises.saveChanges }).click();
    await expect(page.getByText(L.exercises.updated)).toBeVisible();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();

    // Delete: confirm() is native — accept it via the dialog handler.
    const updatedCard = page.locator('.overflow-hidden', { hasText: updatedName });
    page.once('dialog', (d) => d.accept());
    await updatedCard.locator('button').nth(1).click();
    await expect(page.getByText(L.exercises.deleted)).toBeVisible();
    await expect(page.getByText(updatedName, { exact: true })).not.toBeVisible();
  });
});
