import { test, expect } from './helpers/test';
import { L } from './helpers/labels';
import { setupCoachWithTrial, uniquePhone } from './helpers/auth';

/**
 * A coach needs at least one exercise in the library before they can build a
 * program/template, so each test creates one first via the API-adjacent UI flow
 * (fast: just the exercise form, not a full library test).
 */
async function createExercise(page: import('@playwright/test').Page, name: string) {
  await page.goto('/fa/coach/exercises');
  await page.getByRole('button', { name: L.exercises.new }).click();
  await page.locator('#ex-name').fill(name);
  await page.getByRole('button', { name: L.exercises.create }).click();
  await expect(page.getByText(L.exercises.created)).toBeVisible();
}

test.describe('coach program builder', () => {
  test('a coach can write a program for a brand-new student by phone and publish it', async ({ page }) => {
    await setupCoachWithTrial(page);
    const exName = `اسکوات ${Date.now()}`;
    await createExercise(page, exName);

    const studentPhone = uniquePhone();
    const programName = `برنامه حجم ${Date.now()}`;

    await page.goto('/fa/coach/programs/new');
    await page.locator('#contact').fill(studentPhone);
    await page.locator('#pname').fill(programName);

    await page.getByRole('button', { name: L.builder.addExercise }).click();
    await page.getByRole('button', { name: exName }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: L.builder.publish }).click();
    await expect(page.getByText(L.builder.published)).toBeVisible();
    await expect(page).toHaveURL(/\/coach\/programs(\b|\/|$)/);
    await expect(page.getByText(programName)).toBeVisible();
  });

  test('missing student contact / name blocks save with a validation toast', async ({ page }) => {
    await setupCoachWithTrial(page);
    await page.goto('/fa/coach/programs/new');
    await page.getByRole('button', { name: L.builder.saveDraft }).click();
    await expect(page.getByText(L.builder.missingMeta)).toBeVisible();
    await expect(page).toHaveURL(/\/coach\/programs\/new/);
  });
});

test.describe('coach program templates', () => {
  test('a coach can create a reusable template and assign it to a student', async ({ page }) => {
    await setupCoachWithTrial(page);
    const exName = `ددلیفت ${Date.now()}`;
    await createExercise(page, exName);

    const templateName = `قالب مبتدی ${Date.now()}`;
    await page.goto('/fa/coach/templates/new');
    await page.locator('#tname').fill(templateName);

    await page.getByRole('button', { name: L.templateBuilder.addExercise }).click();
    await page.getByRole('button', { name: exName }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: L.templateBuilder.save }).click();
    await expect(page.getByText(L.templateBuilder.saved)).toBeVisible();
    await expect(page).toHaveURL(/\/coach\/templates(\b|\/|$)/);
    await expect(page.getByText(templateName)).toBeVisible();

    // Assign it to a brand-new student by phone (this coach has exactly one
    // template, so the assign button is unambiguous).
    await page.getByRole('button', { name: L.templates.assign }).click();
    const studentPhone = uniquePhone();
    await page.locator('#a-contact').fill(studentPhone);
    await page.getByRole('button', { name: L.templates.assignAsDraft }).click();
    await expect(page.getByText(L.templates.assigned.replace('{contact}', studentPhone))).toBeVisible();
  });
});
