import { z } from 'zod';
import { HANDLE_REGEX } from '../utils/handle';

export const socialLinkSchema = z.object({
  type: z.string().min(1).max(40),
  label: z.string().max(120).optional(),
  url: z.string().min(1).max(500),
});

export const updateCoachProfileSchema = z.object({
  handle: z
    .string()
    .regex(HANDLE_REGEX, 'handle must be 3–30 chars of lowercase letters, digits or hyphens')
    .optional(),
  name: z.string().min(1).max(120).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  socialLinks: z.array(socialLinkSchema).max(20).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  cardNumber: z.string().max(34).nullable().optional(),
  cardHolder: z.string().max(120).nullable().optional(),
  programPrice: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
});

export type UpdateCoachProfileDto = z.infer<typeof updateCoachProfileSchema>;
