import "server-only";
import type { AppConfig } from "../config";

/**
 * Every knob for the exercise-video pipeline in one typed shape, built from env
 * (`server/config.ts`) so nothing downstream reads `process.env` directly. Pass it
 * into `VideoCompressor` / `VideoService` — that is what makes them testable
 * without an environment.
 */
export interface VideoLimits {
  /** Hard ceiling on the uploaded (pre-compression) file. */
  maxBytes: number;
  /** Accepted `Content-Type` values. */
  mimeTypes: readonly string[];
  /** Accepted filename extensions, lowercase, with the dot. */
  extensions: readonly string[];
}

export interface CompressionSettings {
  /** x264 constant-rate factor: lower = better quality + larger file. */
  crf: number;
  /** x264 speed/compression trade-off. */
  preset: string;
  /** Clips wider than this are scaled down; narrower ones are left alone. */
  maxWidth: number;
  audioBitrateKbps: number;
  /** Abort a single ffmpeg run after this long. */
  timeoutMs: number;
}

export interface VideoConfig {
  limits: VideoLimits;
  compression: CompressionSettings;
  ffmpegPath?: string;
  ffprobePath?: string;
}

/**
 * The accepted container formats, as MIME type → allowed extensions.
 *
 * Both halves are checked: a browser's `Content-Type` is caller-supplied and a
 * filename extension is trivially renamed, so neither is trustworthy alone. They
 * are a cheap first gate — `ffprobe` is what actually proves the bytes are a video.
 */
export const VIDEO_FORMATS: Readonly<Record<string, readonly string[]>> = {
  "video/mp4": [".mp4", ".m4v"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
  "video/x-msvideo": [".avi"],
  "video/avi": [".avi"],
  "video/x-m4v": [".m4v"],
};

export const VIDEO_MIME_TYPES = Object.keys(VIDEO_FORMATS);
export const VIDEO_EXTENSIONS = [
  ...new Set(Object.values(VIDEO_FORMATS).flat()),
];

/** Container the compressor always writes, regardless of what came in. */
export const OUTPUT_CONTENT_TYPE = "video/mp4";
export const OUTPUT_EXTENSION = ".mp4";

export function buildVideoConfig(config: AppConfig): VideoConfig {
  return {
    limits: {
      maxBytes: config.get("NEXT_PUBLIC_VIDEO_MAX_UPLOAD_MB") * 1024 * 1024,
      mimeTypes: VIDEO_MIME_TYPES,
      extensions: VIDEO_EXTENSIONS,
    },
    compression: {
      crf: config.get("VIDEO_CRF"),
      preset: config.get("VIDEO_PRESET"),
      maxWidth: config.get("VIDEO_MAX_WIDTH"),
      audioBitrateKbps: config.get("VIDEO_AUDIO_BITRATE_KBPS"),
      timeoutMs: config.get("VIDEO_TIMEOUT_MS"),
    },
    ffmpegPath: config.get("FFMPEG_PATH"),
    ffprobePath: config.get("FFPROBE_PATH"),
  };
}
