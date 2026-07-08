import { randomBytes } from 'node:crypto';

/** Public-page handle format: 3–30 chars, lowercase letters/digits/hyphens. */
export const HANDLE_REGEX = /^[a-z0-9-]{3,30}$/;

/** Slugify a free-text name into a candidate handle (drops non-ascii, e.g. Persian). */
export function slugifyHandle(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

export function randomHandleSuffix(): string {
  return randomBytes(3).toString('hex'); // 6 hex chars
}

/**
 * Produce a unique handle from a name, using an async existence check. Falls back
 * to `coach-<rand>` when the name has no usable ascii (e.g. a Persian-only name).
 */
export async function generateUniqueHandle(
  name: string,
  exists: (handle: string) => Promise<boolean>,
): Promise<string> {
  let base = slugifyHandle(name);
  if (base.length < 3) base = `coach-${randomHandleSuffix()}`;
  if (!(await exists(base))) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, 30)}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base.slice(0, 23)}-${randomHandleSuffix()}`;
}
