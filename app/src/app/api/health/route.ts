import { ok } from "@/server/http/envelope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const smsProvider = process.env.SMS_PROVIDER === "smsir" ? "smsir" : "mock";
  return ok({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    sms: {
      provider: smsProvider,
      // smsir needs both an API key and a template id, or every OTP is dropped.
      configured:
        smsProvider === "smsir"
          ? Boolean(process.env.SMSIR_API_KEY && process.env.SMSIR_TEMPLATE_ID)
          : true,
    },
  });
}
