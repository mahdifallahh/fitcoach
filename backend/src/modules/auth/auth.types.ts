import { Role } from '@prisma/client';

/** Payload embedded in the access JWT. */
export interface JwtPayload {
  sub: string; // user id
  role: Role;
}

/** Authenticated principal attached to the request by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: Role;
}

export interface CookieSpec {
  name: string;
  value: string;
  options: Record<string, unknown>;
}
