import { api } from './client';
import type { CurrentUser, Role } from './types';

export interface RequestOtpResult {
  channel: 'SMS' | 'EMAIL';
  sentTo: string;
  /** Dev-only: the backend echoes the code so the login form can auto-fill it. */
  devCode?: string;
}

/** Whether the phone already has an account, and whether it can sign in with a password. */
export interface IdentifierStatus {
  exists: boolean;
  hasPassword: boolean;
}

export interface VerifyOtpResult {
  user: CurrentUser;
  /** New account (or one that never set a password) → prompt to choose one. */
  isNew: boolean;
}

export const authApi = {
  /** Decides the next step: password sign-in vs. OTP signup. */
  check: (identifier: string) => api.post<IdentifierStatus>('/auth/check', { identifier }),

  loginWithPassword: (identifier: string, password: string) =>
    api.post<{ user: CurrentUser }>('/auth/login', { identifier, password }),

  setPassword: (password: string) =>
    api.post<{ success: boolean }>('/auth/set-password', { password }),

  requestOtp: (identifier: string) =>
    api.post<RequestOtpResult>('/auth/otp/request', { identifier }),

  verifyOtp: (identifier: string, code: string, role?: Role) =>
    api.post<VerifyOtpResult>('/auth/otp/verify', { identifier, code, role }),

  me: () => api.get<CurrentUser>('/auth/me'),

  logout: () => api.post<{ success: boolean }>('/auth/logout'),
};

/** Home route for each role — used after login and by the client route guard. */
export function roleHome(role: Role): string {
  if (role === 'ADMIN') return '/admin';
  return role === 'COACH' ? '/coach' : '/student';
}
