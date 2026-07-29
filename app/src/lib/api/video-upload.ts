import { ApiError, type ApiErrorShape } from './client';

/**
 * Accepted video formats, mirroring `server/video/config.ts`. Duplicated on
 * purpose: the browser needs them to filter the file picker and to reject a bad
 * file before uploading it. The server re-validates everything — this copy is a
 * courtesy to the user, never the control.
 */
export const VIDEO_FORMATS: Readonly<Record<string, readonly string[]>> = {
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/avi': ['.avi'],
  'video/x-m4v': ['.m4v'],
};

export const ACCEPTED_VIDEO_TYPES = Object.keys(VIDEO_FORMATS);
export const ACCEPTED_VIDEO_EXTENSIONS = [
  ...new Set(Object.values(VIDEO_FORMATS).flat()),
];

/**
 * Same ceiling the server enforces — one env var feeds both sides, so they can't
 * drift. `NEXT_PUBLIC_*` is inlined at build time, hence the literal fallback.
 */
export const MAX_VIDEO_MB = Number(
  process.env.NEXT_PUBLIC_VIDEO_MAX_UPLOAD_MB ?? 100,
);
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

export type VideoRejection = 'type' | 'extension' | 'size';

/**
 * Client-side pre-flight. Returns the reason the file is unacceptable, or `null`
 * when it looks fine — the caller turns the reason into a translated sentence, so
 * the user learns *what* is wrong instead of watching an upload fail.
 */
export function checkVideoFile(file: File): VideoRejection | null {
  const allowedExtensions = VIDEO_FORMATS[file.type.toLowerCase()];
  if (!allowedExtensions) return 'type';

  const dot = file.name.lastIndexOf('.');
  const extension = dot > 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!allowedExtensions.includes(extension)) return 'extension';

  if (file.size > MAX_VIDEO_BYTES) return 'size';
  return null;
}

export interface UploadedVideo {
  url: string;
  bytes: number;
  originalBytes: number;
  durationSec: number;
  width: number;
  height: number;
}

export interface UploadVideoOptions {
  /** 0–1 as the bytes leave the browser. */
  onProgress?: (fraction: number) => void;
  /** Fires once the bytes are all sent and the server starts transcoding. */
  onProcessingStart?: () => void;
  signal?: AbortSignal;
}

/**
 * Uploads a video to the transcoding endpoint.
 *
 * Uses `XMLHttpRequest` rather than `fetch` for one reason: `fetch` still has no
 * upload-progress event, and a 100 MB upload with no progress bar looks frozen.
 * The response envelope is unwrapped the same way `api.*` does it, so callers get
 * an `ApiError` with a `code` they can translate.
 */
export function uploadExerciseVideo(
  file: File,
  options: UploadVideoOptions = {},
): Promise<UploadedVideo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `/api/coach/exercises/video-upload?filename=${encodeURIComponent(file.name)}`;
    xhr.open('POST', url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
    };
    // Bytes are all sent; from here the wait is server-side transcoding.
    xhr.upload.onload = () => options.onProcessingStart?.();

    xhr.onload = () => {
      let json: { success?: boolean; data?: UploadedVideo; error?: ApiErrorShape } = {};
      try {
        json = JSON.parse(xhr.responseText) as typeof json;
      } catch {
        /* falls through to the generic error below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.success && json.data) {
        resolve(json.data);
        return;
      }
      reject(
        new ApiError(
          xhr.status,
          json.error ?? { code: 'UPLOAD_FAILED', message: xhr.statusText },
        ),
      );
    };
    xhr.onerror = () =>
      reject(new ApiError(0, { code: 'NETWORK_ERROR', message: 'Network error' }));
    xhr.onabort = () =>
      reject(new ApiError(0, { code: 'UPLOAD_ABORTED', message: 'Upload cancelled' }));

    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
