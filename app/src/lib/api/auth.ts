import { api } from './client';
import type { CurrentUser, Role } from './types';

export interface RequestOtpResult {
  channel: 'SMS' | 'EMAIL';
  sentTo: string;
  /** Dev-only: the backend echoes the code so the login form can auto-fill it. */
  devCode?: string;
}

export const authApi = {
  requestOtp: (identifier: string) =>
    api.post<RequestOtpResult>('/auth/otp/request', { identifier }),

  verifyOtp: (identifier: string, code: string, role?: Role) =>
    api.post<{ user: CurrentUser }>('/auth/otp/verify', { identifier, code, role }),

  me: () => api.get<CurrentUser>('/auth/me'),

  logout: () => api.post<{ success: boolean }>('/auth/logout'),
};

/** Home route for each role — used after login and by the client route guard. */
export function roleHome(role: Role): string {
  if (role === 'ADMIN') return '/admin';
  return role === 'COACH' ? '/coach' : '/student';
}
