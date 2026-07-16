import "server-only";
import { AppConfig } from "./config";

/**
 * Pluggable provider contracts. The dev "mock" implementations log to the
 * console; production implementations (vendor SMS, SMTP) are selected via env
 * (SMS_PROVIDER / EMAIL_PROVIDER) without touching the auth flow.
 */
export interface SmsProvider {
  readonly name: string;
  /** Free-form text. Template-only vendors (SMS.ir) reject this. */
  send(to: string, message: string): Promise<void>;
  /**
   * Deliver a login code. Vendors restricted to pre-approved templates implement
   * this directly; generic providers fall back to `send`.
   */
  sendOtp?(to: string, code: string): Promise<void>;
}

export interface EmailProvider {
  readonly name: string;
  send(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void>;
}

class MockSmsProvider implements SmsProvider {
  readonly name = "mock";
  async send(to: string, message: string): Promise<void> {
    console.log(`\n[SMS →${to}] ${message}\n`);
  }
}

class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  async send(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    console.log(`\n[EMAIL →${input.to}] ${input.subject}\n${input.text}\n`);
  }
}

/**
 * SMS.ir "Verify" API — the Iranian carrier route for OTP. The account may only
 * send pre-approved templates, so the code travels as a named parameter instead
 * of free text (a plain message would be rejected by the operator).
 *
 * POST https://api.sms.ir/v1/send/verify
 *   headers: { 'X-API-KEY': <key> }
 *   body:    { mobile, templateId, parameters: [{ name, value }] }
 */
class SmsIrProvider implements SmsProvider {
  readonly name = "smsir";
  private readonly endpoint = "https://api.sms.ir/v1/send/verify";

  constructor(
    private readonly apiKey: string,
    private readonly templateId: number,
    private readonly parameterName: string,
  ) {}

  /** SMS.ir expects a local 09xxxxxxxxx number, not the E.164 we store. */
  private toLocal(phone: string): string {
    return phone.replace(/^\+98/, "0").replace(/^98(?=9)/, "0");
  }

  async sendOtp(to: string, code: string): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify({
        mobile: this.toLocal(to),
        templateId: this.templateId,
        parameters: [{ name: this.parameterName, value: code }],
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      status?: number;
      message?: string;
    } | null;

    // SMS.ir answers HTTP 200 with status=1 on success; anything else failed.
    if (!res.ok || body?.status !== 1) {
      throw new Error(
        `SMS.ir send failed (http ${res.status}, status ${body?.status ?? "?"}): ${
          body?.message ?? "unknown error"
        }`,
      );
    }
  }

  async send(to: string, message: string): Promise<void> {
    throw new Error(
      `SMS.ir only sends approved templates; refusing free text to ${to}: ${message}`,
    );
  }
}

/**
 * Composes auth messages and dispatches them through the configured providers.
 * Message wording is intentionally bilingual-friendly and provider-agnostic.
 */
export class NotificationsService {
  constructor(
    private readonly sms: SmsProvider,
    private readonly email: EmailProvider,
    private readonly config: AppConfig,
  ) {}

  async sendOtpCode(
    channel: "SMS" | "EMAIL",
    identifier: string,
    code: string,
  ): Promise<void> {
    const ttlMin = Math.round(this.config.get("OTP_TTL_SECONDS") / 60);

    if (channel === "SMS") {
      if (this.sms.sendOtp) {
        await this.sms.sendOtp(identifier, code);
      } else {
        await this.sms.send(
          identifier,
          `fitlo code: ${code} (valid ${ttlMin}m) | کد ورود: ${code}`,
        );
      }
      return;
    }

    const subject = "fitlo login code | کد ورود فیتلو";
    await this.email.send({
      to: identifier,
      subject,
      text: `Your fitlo login code is ${code}. It expires in ${ttlMin} minutes.`,
      html: `<p>Your fitlo login code is <strong>${code}</strong>.</p><p>It expires in ${ttlMin} minutes.</p>`,
    });
  }
}

function createSmsProvider(config: AppConfig): SmsProvider {
  if (config.get("SMS_PROVIDER") !== "smsir") return new MockSmsProvider();

  const apiKey = config.get("SMSIR_API_KEY");
  const templateId = config.get("SMSIR_TEMPLATE_ID");
  if (!apiKey || !templateId) {
    // Fail loudly at boot rather than silently dropping every production OTP.
    throw new Error(
      "SMS_PROVIDER=smsir requires SMSIR_API_KEY and SMSIR_TEMPLATE_ID",
    );
  }
  return new SmsIrProvider(apiKey, templateId, config.get("SMSIR_PARAM_NAME"));
}

export function createNotificationsService(
  config: AppConfig,
): NotificationsService {
  return new NotificationsService(
    createSmsProvider(config),
    new MockEmailProvider(),
    config,
  );
}
