import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

/**
 * Locale config. Adding a language = add its code here + a messages/<code>.json
 * file + a direction entry below. No other structural change is required.
 */
export const routing = defineRouting({
  locales: ["fa", "en"],
  defaultLocale: "fa",
  localePrefix: "always",
  // Always default to Persian: don't auto-switch to English from the browser's
  // Accept-Language header. Visitors can still pick English from the switcher.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

/** Text direction per locale. */
export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};

export const localeLabels: Record<Locale, string> = {
  fa: "فارسی",
  en: "English",
};

// Locale-aware navigation helpers (use these instead of next/link & next/navigation)
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
