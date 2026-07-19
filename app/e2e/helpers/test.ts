import { test as base } from '@playwright/test';

/** Must match SESSION_KEY in components/pwa/install-prompt.tsx. */
export const INSTALL_PROMPT_SESSION_KEY = 'fitlo:install-shown';

/**
 * Shared test fixture.
 *
 * Entering an app area (/coach, /student, /admin) auto-opens the PWA install
 * modal once per session. That's intended for real users, but its overlay
 * blocks clicks and hides the page from the a11y tree, which would make every
 * in-panel test flaky. Mark it as "already shown" before any page script runs,
 * so specs interact with the real UI. `pwa-install.spec.ts` deliberately does
 * NOT use this fixture — it asserts the prompt behaviour.
 */
export const test = base.extend<{ suppressInstallPrompt: void }>({
  suppressInstallPrompt: [
    async ({ page }, use) => {
      await page.addInitScript((key) => {
        try {
          sessionStorage.setItem(key, '1');
        } catch {
          /* storage unavailable — prompt just shows, tests still handle it */
        }
      }, INSTALL_PROMPT_SESSION_KEY);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
