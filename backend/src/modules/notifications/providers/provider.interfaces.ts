/**
 * Pluggable provider contracts. The dev "mock" implementations log to the
 * console; production implementations (vendor SMS, SMTP) are selected via env
 * (SMS_PROVIDER / EMAIL_PROVIDER) without touching the auth flow.
 */
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<void>;
}

export interface EmailProvider {
  readonly name: string;
  send(input: { to: string; subject: string; html: string; text: string }): Promise<void>;
}
