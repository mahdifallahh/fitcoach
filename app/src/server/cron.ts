import "server-only";
import cron from "node-cron";
import { getSubscriptions } from "./container";

let started = false;

/**
 * Starts the background schedules once per server process. Replaces the Nest
 * `@nestjs/schedule` `@Cron(EVERY_HOUR)` sweep. Called from `instrumentation.ts`.
 */
export function startCron(): void {
  if (started) return;
  started = true;

  // Hourly: flip lapsed time-based (paid) plans to EXPIRED (coach becomes
  // read-only). Permanent tier rows have a null endsAt and are never swept.
  cron.schedule("0 * * * *", async () => {
    try {
      const n = await getSubscriptions().expireDue();
      if (n) console.log(`[cron] expired ${n} subscription(s)`);
    } catch (e) {
      console.error("[cron] expiry sweep failed:", e);
    }
  });

  console.log("[cron] scheduled hourly subscription expiry sweep");
}
