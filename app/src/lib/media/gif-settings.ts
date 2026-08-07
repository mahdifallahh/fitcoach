/**
 * Output budget for a converted exercise demo.
 *
 * GIF is a deliberately poor format for video — it has no inter-frame motion
 * compression, so every frame costs roughly a full quantized image. A 10-second
 * 720p clip becomes a 30 MB GIF that no one on mobile data will wait for. These
 * numbers are what keeps the result in the few-hundred-kilobyte range, and they
 * are chosen against how the file is actually used: a looping demo shown at
 * about 80–160 px in the exercise card and the program viewer.
 */
export const GIF_MAX_WIDTH = 320;

/** Demos read fine well below video frame rates, and cost scales linearly. */
export const GIF_FPS = 10;

/**
 * A demo is one or two reps. Past this the file grows without teaching anything
 * more, so a longer clip is trimmed from the start rather than refused.
 */
export const GIF_MAX_SECONDS = 4;

/** GIF is limited to 256 colours per frame regardless; this is that ceiling. */
export const GIF_PALETTE_SIZE = 256;

export const GIF_MAX_FRAMES = GIF_FPS * GIF_MAX_SECONDS;

/** What the file input accepts once video conversion is available. */
export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
] as const;

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
