import { api } from './client';
import type { CoachProfile, SocialLink, UploadTarget } from './types';

export interface UpdateCoachProfileInput {
  handle?: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  socialLinks?: SocialLink[];
  tags?: string[];
  cardNumber?: string | null;
  cardHolder?: string | null;
  programPrice?: number | null;
}

export const coachProfileApi = {
  get: () => api.get<CoachProfile>('/coach/profile'),
  update: (input: UpdateCoachProfileInput) => api.patch<CoachProfile>('/coach/profile', input),
  avatarUploadUrl: (contentType: string) =>
    api.post<UploadTarget>('/coach/profile/avatar-upload-url', { contentType }),
};
