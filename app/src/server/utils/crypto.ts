import {
  createHash,
  randomBytes,
  randomInt,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/** Generate a numeric OTP code of the given length (no leading-zero loss). */
export function generateNumericCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += randomInt(0, 10).toString();
  return code;
}

/** Cryptographically-random URL-safe token (for magic links / refresh tokens). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Deterministic hash for storing secrets (OTP codes, refresh tokens) at rest. */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison of two hex hashes. */
export function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ── Passwords ────────────────────────────────────────────────────────────────
// scrypt from node's stdlib: memory-hard, no native dependency to install or
// rebuild per platform. Stored as `scrypt$<saltHex>$<hashHex>` so the algorithm
// is self-describing and can be migrated later without guessing.

const SCRYPT_KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(plain, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Constant-time password check. Returns false for malformed/legacy hashes. */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(plain, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}
