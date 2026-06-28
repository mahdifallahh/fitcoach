import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Generate a numeric OTP code of the given length (no leading-zero loss). */
export function generateNumericCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) code += randomInt(0, 10).toString();
  return code;
}

/** Cryptographically-random URL-safe token (for magic links / refresh tokens). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Deterministic hash for storing secrets (OTP codes, refresh tokens) at rest. */
export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time comparison of two hex hashes. */
export function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
