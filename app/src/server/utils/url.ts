import { z } from "zod";

/** True only for absolute http(s) URLs — the two schemes safe to put in an href. */
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A coach-supplied link that is rendered as an `<a href>` — on the public coach
 * page, in the student's program viewer, and in the exported PDF.
 *
 * The scheme is the entire security boundary. `javascript:` and `data:` URLs in
 * an href execute in the *reader's* session, not the author's, and anyone can
 * sign up as a coach — so this is untrusted input reaching a page that strangers
 * open. Escaping does not help: the value is a legal attribute either way.
 *
 * A missing scheme is assumed to be https rather than rejected, because
 * "instagram.com/name" is what a coach actually types; anything that still is
 * not an http(s) URL after that is refused.
 */
export function externalUrl(max = 500) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((raw) =>
      // Only a string with *no* scheme gets https prepended. Prefixing blindly
      // would turn "file:///etc/passwd" into the valid-but-nonsense
      // "https://file:///etc/passwd" and store it, instead of refusing it.
      HAS_SCHEME.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`,
    )
    .refine(isHttpUrl, { message: "must be a valid http(s) link" });
}

/** `scheme:` per RFC 3986 — enough to tell "javascript:…" from "t.me/coach". */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
