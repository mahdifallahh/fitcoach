import { test as base } from "@playwright/test";

export const INSTALL_PROMPT_SESSION_KEY = "fitlo:install-shown";
export const test = base.extend<{ suppressInstallPrompt: void }>({
  suppressInstallPrompt: [
    async ({ page }, use) => {
      await page.addInitScript((key) => {
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          /* storage unavailable — prompt just shows, tests still handle it */
        }
      }, INSTALL_PROMPT_SESSION_KEY);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
