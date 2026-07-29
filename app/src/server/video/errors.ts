import {
  AppError,
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from "../http/errors";

/**
 * Every way the video pipeline can fail, as a closed union rather than raw
 * strings. The client maps these codes to translated sentences
 * (`lib/api/client.ts` → `KNOWN_ERROR_MESSAGES`), so a coach sees "the file is
 * larger than 100 MB", never a stack trace or a bare 500.
 */
export type VideoErrorCode =
  /** Declared Content-Type is not one of the accepted containers. */
  | "VIDEO_TYPE_NOT_ALLOWED"
  /** Filename extension is missing, or doesn't match the declared type. */
  | "VIDEO_EXTENSION_MISMATCH"
  /** Body exceeded the configured ceiling (checked while streaming). */
  | "VIDEO_TOO_LARGE"
  /** Empty body / no filename — nothing to work with. */
  | "VIDEO_EMPTY"
  /** ffprobe could not find a video stream: corrupt, or not really a video. */
  | "VIDEO_CORRUPT"
  /** ffmpeg exited non-zero. */
  | "VIDEO_ENCODING_FAILED"
  /** ffmpeg ran past `compression.timeoutMs` and was killed. */
  | "VIDEO_TIMEOUT"
  /** No ffmpeg/ffprobe binary on this host. */
  | "VIDEO_TOOLING_UNAVAILABLE";

/** English fallback sentences; the UI prefers its own translation by code. */
const MESSAGES: Record<VideoErrorCode, string> = {
  VIDEO_TYPE_NOT_ALLOWED:
    "Unsupported video format. Allowed: MP4, MOV, WebM, AVI.",
  VIDEO_EXTENSION_MISMATCH:
    "The file extension does not match the video format.",
  VIDEO_TOO_LARGE: "The video is larger than the allowed maximum.",
  VIDEO_EMPTY: "No video file was received.",
  VIDEO_CORRUPT: "The file is not a readable video, or it is damaged.",
  VIDEO_ENCODING_FAILED: "The video could not be processed.",
  VIDEO_TIMEOUT: "Processing the video took too long and was cancelled.",
  VIDEO_TOOLING_UNAVAILABLE:
    "Video processing is not available on this server.",
};

/** HTTP status per failure: caller's fault (4xx) vs. ours (5xx). */
function statusFor(code: VideoErrorCode): number {
  switch (code) {
    case "VIDEO_TOO_LARGE":
      return 413;
    case "VIDEO_TIMEOUT":
      return 504;
    case "VIDEO_ENCODING_FAILED":
    case "VIDEO_TOOLING_UNAVAILABLE":
      return 503;
    default:
      return 400;
  }
}

/**
 * Build the typed error for a failure code. Returns the framework error shims so
 * `mapError` produces the usual `{ success: false, error: { code, message } }`
 * envelope with the right status.
 *
 * `details` carries machine-readable context (e.g. the limit that was exceeded)
 * for a client that wants to interpolate it into its own message.
 */
export function videoError(
  code: VideoErrorCode,
  details?: Record<string, unknown>,
): AppError {
  const payload = { code, message: MESSAGES[code], details };
  const status = statusFor(code);
  if (status === 400) return new BadRequestException(payload);
  if (status === 503) return new ServiceUnavailableException(payload);
  return new HttpException(payload, status);
}
