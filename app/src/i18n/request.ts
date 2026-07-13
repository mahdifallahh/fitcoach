import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // Global default avoids hydration mismatches on date/time formatting.
    timeZone: "Asia/Tehran",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
