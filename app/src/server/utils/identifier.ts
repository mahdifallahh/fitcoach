/**
 * Identifier normalization. The same normalization is applied when a coach
 * stores a student's contact and when that student later registers, so the
 * linking rule matches reliably. Phones → E.164 (Iran-aware), emails → lowercased.
 */
export type IdentifierChannel = "SMS" | "EMAIL";

export interface NormalizedIdentifier {
  channel: IdentifierChannel;
  value: string;
}

export function isEmail(input: string): boolean {
  return /.+@.+\..+/.test(input.trim());
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Best-effort E.164 normalization, biased toward Iranian mobile formats. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0") && digits.length === 11)
    return `+98${digits.slice(1)}`; // 09xxxxxxxxx
  if (digits.length === 10 && digits.startsWith("9")) return `+98${digits}`; // 9xxxxxxxxx
  if (digits.startsWith("98") && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

export function normalizeIdentifier(input: string): NormalizedIdentifier {
  if (isEmail(input)) return { channel: "EMAIL", value: normalizeEmail(input) };
  return { channel: "SMS", value: normalizePhone(input) };
}
