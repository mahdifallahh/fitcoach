import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, mapError } from "@/server/http/envelope";
import { getSession } from "@/server/auth/session";
import { UnauthorizedException } from "@/server/http/errors";
import { getAuth, getTokens, getUsers } from "@/server/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ role: z.enum(["COACH", "STUDENT"]) });

/**
 * Turn on the other side of this account — one phone can be both a coach and a
 * student. Idempotent.
 *
 * Written without `withRoute` because it has to set a cookie: capabilities are
 * carried in the access token, so the token is re-minted here and returned as a
 * fresh cookie, making the newly enabled panel reachable immediately instead of
 * after the next refresh.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const { role } = schema.parse(await req.json());

    const users = getUsers();
    if (role === "COACH") await users.enableCoach(session.id);
    else await users.enableStudent(session.id);

    const accessToken = await getAuth().reissueAccessToken(session.id);
    return ok(await users.getProfileSnapshot(session.id), {
      cookies: [getTokens().buildAccessCookie(accessToken)],
    });
  } catch (err) {
    return mapError(err);
  }
}
