import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import type { Role } from "@prisma/client";
import { ok, mapError } from "./envelope";
import {
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from "./errors";
import { getSession } from "../auth/session";
import { getSubscriptions } from "../container";
import type { AuthUser } from "../auth/types";

export interface RouteContext<B> {
  req: NextRequest;
  /** Dynamic route params (already awaited). */
  params: Record<string, string>;
  /** Authenticated principal — non-null unless the route is `public`. */
  user: AuthUser;
  /** Parsed + validated body when `bodySchema` is provided; else `undefined`. */
  body: B;
}

export interface RouteOptions<B> {
  /** Skip auth entirely (mirrors `@Public()`). */
  public?: boolean;
  /** Restrict to role(s) (mirrors `@Roles(...)`). */
  role?: Role | Role[];
  /** Gate writes behind an active coach subscription (mirrors `@RequiresActiveSubscription()`). */
  requiresSub?: boolean;
  /** Validate + parse the JSON body with this schema. */
  bodySchema?: ZodType<B>;
}

type NextRouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * The guard chain, replicated as a wrapper: auth → role → subscription →
 * validate → run → envelope (+ error mapping). Handlers return plain data; the
 * wrapper shapes `{ success, data }` / `{ success, error }`.
 */
export function withRoute<B = undefined>(
  handler: (ctx: RouteContext<B>) => Promise<unknown>,
  options: RouteOptions<B> = {},
): NextRouteHandler {
  return async (req, context) => {
    try {
      const params = (await context?.params) ?? {};

      let user: AuthUser | null = null;
      if (!options.public) {
        user = await getSession(req);
        if (!user) {
          throw new UnauthorizedException({
            code: "UNAUTHENTICATED",
            message: "Not authenticated",
          });
        }
        if (options.role) {
          const roles = Array.isArray(options.role)
            ? options.role
            : [options.role];
          if (!roles.includes(user.role)) {
            throw new ForbiddenException({
              code: "FORBIDDEN_ROLE",
              message: "Insufficient role",
            });
          }
        }
        if (
          options.requiresSub &&
          user.role === "COACH" &&
          !(await getSubscriptions().isActive(user.id))
        ) {
          throw new HttpException(
            {
              code: "SUBSCRIPTION_REQUIRED",
              message: "An active subscription is required to create or edit.",
            },
            402,
          );
        }
      }

      let body = undefined as B;
      if (options.bodySchema) {
        const json = await req.json().catch(() => ({}));
        body = options.bodySchema.parse(json);
      }

      const data = await handler({ req, params, user: user as AuthUser, body });
      return ok(data);
    } catch (err) {
      return mapError(err);
    }
  };
}
