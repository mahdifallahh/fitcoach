import { api } from './client';
import type { CoachProfile, SocialLink, UploadTarget } from './types';

export interface UpdateCoachProfileInput {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  socialLinks?: SocialLink[];
  tags?: string[];
}

export const coachProfileApi = {
  get: () => api.get<CoachProfile>('/coach/profile'),
  update: (input: UpdateCoachProfileInput) => api.patch<CoachProfile>('/coach/profile', input),
  avatarUploadUrl: (contentType: string) =>
    api.post<UploadTarget>('/coach/profile/avatar-upload-url', { contentType }),
};
