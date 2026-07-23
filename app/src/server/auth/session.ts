import "server-only";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getTokens } from "../container";
import { ACCESS_COOKIE } from "./tokens";
import type { AuthUser } from "./types";

/**
 * Resolve the authenticated principal from the access-token cookie. Pass the
 * `NextRequest` inside route handlers (sync cookie read); called without an arg
 * it falls back to the async `next/headers` cookie store (server components).
 * Returns null when there is no valid session — callers decide the response.
 */
export async function getSession(req?: NextRequest): Promise<AuthUser | null> {
  const token = req
    ? req.cookies.get(ACCESS_COOKIE)?.value
    : (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await getTokens().verifyAccessToken(token);
    return {
      id: payload.sub,
      role: payload.role,
      isCoach: payload.isCoach,
      isStudent: payload.isStudent,
    };
  } catch {
    return null;
  }
}
