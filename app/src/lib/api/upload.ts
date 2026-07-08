import type { UploadTarget } from './types';

/**
 * Two-step direct upload: the backend returns a presigned PUT target, the
 * browser uploads the bytes straight to S3/MinIO, and we return the public URL
 * to persist on the entity.
 */
export async function uploadFile(
  getTarget: (contentType: string) => Promise<UploadTarget>,
  file: File,
): Promise<string> {
  const target = await getTarget(file.type);
  const res = await fetch(target.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
  return target.publicUrl;
}

export const ACCEPTED_IMAGE_TYPES = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
