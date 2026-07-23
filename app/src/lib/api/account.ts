import { api } from './client';
import type { CurrentUser } from './types';

/** Account-level actions: enabling the other role, and deletion. */
export const accountApi = {
  /**
   * Turn on the coach or student side of this account (idempotent). The server
   * returns a refreshed session cookie, so the new panel is usable immediately.
   */
  enableRole: (role: 'COACH' | 'STUDENT') =>
    api.post<CurrentUser>('/account/roles', { role }),

  /** Permanently delete the account. Requires the current password. */
  remove: (password: string) =>
    api.delete<{ deleted: boolean }>('/account', { password }),
};
