import type { Role } from "@prisma/client";
import type { UserCapabilities } from "./tokens";

/**
 * Authenticated principal resolved from the access-token cookie. `role` is the
 * primary/landing role (and the ADMIN marker); coach/student access is decided
 * by the capability flags, since one account can hold both.
 */
export interface AuthUser extends UserCapabilities {
  id: string;
  role: Role;
}
