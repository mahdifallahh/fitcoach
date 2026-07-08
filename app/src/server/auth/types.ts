import type { Role } from '@prisma/client';

/** Authenticated principal resolved from the access-token cookie. */
export interface AuthUser {
  id: string;
  role: Role;
}
