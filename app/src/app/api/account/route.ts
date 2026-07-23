import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, mapError } from "@/server/http/envelope";
import { getSession } from "@/server/auth/session";
import {
  BadRequestException,
  UnauthorizedException,
} from "@/server/http/errors";
import { clientIp, rateLimit } from "@/server/http/rate-limit";
import { verifyPassword } from "@/server/utils/crypto";
import { getTokens, getUsers } from "@/server/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(1) });

/**
 * Permanently delete the signed-in account (irreversible).
 *
 * Best-practice guards, all required:
 *  - an authenticated session,
 *  - **re-authentication** with the current password, so a hijacked/borrowed
 *    open session can't nuke the account,
 *  - rate limiting, since this is an attractive brute-force target,
 *  - session cookies cleared on the way out.
 * The UI adds a type-to-confirm step on top.
 */
export async function DELETE(req: NextRequest) {
  try {
    await rateLimit(`account-delete:${clientIp(req)}`, 5, 60);

    const session = await getSession(req);
    if (!session) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { password } = schema.parse(await req.json());
    const users = getUsers();
    const user = await users.findById(session.id);
    if (!user) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    // Accounts that never set a password can't re-authenticate this way; they
    // must set one first rather than us silently skipping the check.
    if (!user.passwordHash) {
      throw new BadRequestException({
        code: "PASSWORD_REQUIRED",
        message: "Set a password before deleting your account",
      });
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({
        code: "BAD_CREDENTIALS",
        message: "Password is incorrect",
      });
    }

    await users.deleteAccount(session.id);
    return ok({ deleted: true }, { cookies: getTokens().clearCookies() });
  } catch (err) {
    return mapError(err);
  }
}
