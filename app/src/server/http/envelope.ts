import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError, statusToCode } from "./errors";

/** Cookie to set on a response (shape from tokens.ts; maxAge in seconds). */
export interface CookieSpec {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
    path?: string;
    maxAge?: number;
  };
}

/** Success envelope: `{ success: true, data }`. */
export function ok<T>(
  data: T,
  init?: { status?: number; cookies?: CookieSpec[] },
): NextResponse {
  const res = NextResponse.json(
    { success: true, data },
    { status: init?.status ?? 200 },
  );
  for (const c of init?.cookies ?? [])
    res.cookies.set(c.name, c.value, c.options);
  return res;
}

/**
 * Error shaper — replicates the old Nest exception filter. Turns any thrown value
 * into `{ success: false, error: { code, message, details? } }` with a status.
 */
export function mapError(err: unknown): NextResponse {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details: unknown;

  if (isAppError(err)) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message =
      err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") ||
      "Invalid request";
    details = err.issues;
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (status >= 500) {
    // A 5xx we raised ourselves is a *handled* degradation with a known cause —
    // PDF_UNAVAILABLE when the host has no Chromium, VIDEO_TOOLING_UNAVAILABLE
    // when it has no ffmpeg. Dumping a stack for those buries the genuinely
    // unexpected 500s in production logs, so give them one readable line and
    // keep the stack for what nobody predicted.
    if (isAppError(err)) console.error(`[api] ${code} (${status}): ${message}`);
    else console.error("[api] unhandled error:", err);
  }
  if (code === "INTERNAL_ERROR" && status !== 500) code = statusToCode(status);

  const body = {
    success: false as const,
    error: {
      code,
      message:
        status >= 500 && process.env.NODE_ENV === "production"
          ? "Internal server error"
          : message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}
