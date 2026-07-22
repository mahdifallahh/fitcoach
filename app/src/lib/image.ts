/**
 * Client-side image downscaling for uploads.
 *
 * Avatars/photos are uploaded straight to S3/MinIO via a presigned PUT (no
 * server-side processing), and the public coach page can't run them through
 * next/image (the optimizer can't reach the browser-only S3 public endpoint).
 * So a phone photo would ship at its full multi-MP size to render in a ~96px
 * slot. Downscaling in the browser before the PUT is the one place we can cap
 * the bytes — it shrinks a typical avatar from hundreds of KB to a few KB and
 * cuts the LCP on `/c/<handle>`.
 *
 * Fully best-effort: any failure (no canvas, decode error, bigger output)
 * returns the original file untouched, so an upload never breaks because of it.
 */
export async function downscaleImage(
  file: File,
  { maxDim = 512, quality = 0.85 }: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  // GIFs may be animated — re-encoding to a still frame would drop the motion.
  // Non-raster or unknown types are left alone too.
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return file;
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    // Already within the cap — no re-encode (avoids needlessly recompressing).
    if (scale >= 1) {
      bitmap.close?.();
      return file;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // WebP gives the smallest bytes across the browsers we target and is an
    // accepted upload type (the server already stores .webp avatars).
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
    if (!blob || blob.size >= file.size) return file; // no win → keep original

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp', lastModified: Date.now() });
  } catch {
    return file;
  }
}
