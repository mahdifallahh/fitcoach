import { z } from 'zod';

export const IMAGE_CONTENT_TYPES = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'] as const;

/** Body for the presigned image-upload endpoints. */
export const imageUploadSchema = z.object({
  contentType: z.enum(IMAGE_CONTENT_TYPES),
});
export type ImageUploadDto = z.infer<typeof imageUploadSchema>;
