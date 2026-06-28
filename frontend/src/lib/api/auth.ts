import { api } from './client';
import type { CurrentUser, Role } from './types';

export interface RequestOtpResult {
  channel: 'SMS' | 'EMAIL';
  sentTo: string;
}

export const authApi = {
  requestOtp: (identifier: string) =>
    api.post<RequestOtpResult>('/auth/otp/request', { identifier }),

  verifyOtp: (identifier: string, code: string, role?: Role) =>
    api.post<{ user: CurrentUser }>('/auth/otp/verify', { identifier, code, role }),

  requestMagicLink: (identifier: string, role?: Role) =>
    api.post<{ sent: boolean }>('/auth/magic-link/request', { identifier, role }),

  me: () => api.get<CurrentUser>('/auth/me'),

  logout: () => api.post<{ success: boolean }>('/auth/logout'),
};
