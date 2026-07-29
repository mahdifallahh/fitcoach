import "server-only";
import { stat } from "node:fs/promises";
import type { CompressionSettings } from "./config";
import type { FfmpegRunner, VideoProbe } from "./ffmpeg";
import { videoError } from "./errors";

export interface CompressResult {
  outputPath: string;
  bytes: number;
  durationSec: number;
  width: number;
  height: number;
}

/**
 * Builds the ffmpeg argument list. Pure and exported so the encoding recipe can be
 * asserted in tests without running ffmpeg.
 *
 * The recipe, and why:
 * - `-crf` + `-preset`: constant-quality encoding rather than a fixed bitrate, so a
 *   static clip stays small while a busy one keeps its detail. CRF 26–28 is visually
 *   fine for a phone-shot demo at a fraction of the source size.
 * - `scale`: only downscales — `min(maxWidth,iw)` leaves an already-small clip
 *   untouched instead of upscaling it. `-2` for height keeps the aspect ratio and
 *   rounds to an even number, which H.264 requires.
 * - `-pix_fmt yuv420p`: the one chroma format every browser and QuickTime decodes.
 * - `-movflags +faststart`: moves the moov atom to the front so playback starts
 *   before the whole file has arrived — the single most important flag for web video.
 * - `-an` when the source is silent: an empty AAC track is pure overhead.
 * - `-progress pipe:1 -nostats`: machine-readable progress on stdout.
 */
export function buildCompressArgs(
  inputPath: string,
  outputPath: string,
  probe: Pick<VideoProbe, "hasAudio">,
  settings: CompressionSettings,
): string[] {
  const audio = probe.hasAudio
    ? ["-c:a", "aac", "-b:a", `${settings.audioBitrateKbps}k`, "-ac", "2"]
    : ["-an"];

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-i",
    inputPath,
    "-vf",
    `scale='min(${settings.maxWidth},iw)':-2`,
    "-c:v",
    "libx264",
    "-crf",
    String(settings.crf),
    "-preset",
    settings.preset,
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    ...audio,
    "-movflags",
    "+faststart",
    // A large A/V interleave gap otherwise aborts the mux on some phone recordings.
    "-max_muxing_queue_size",
    "1024",
    "-progress",
    "pipe:1",
    "-nostats",
    outputPath,
  ];
}

/**
 * The dimensions the `scale='min(maxWidth,iw)':-2` filter will actually produce.
 * Mirrors the filter exactly: never upscales, and rounds both sides to an even
 * number because H.264 cannot encode odd dimensions in yuv420p.
 */
export function scaledDimensions(
  width: number,
  height: number,
  maxWidth: number,
): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { width: even(maxWidth), height: even((height * maxWidth) / width) };
}

/**
 * Turns a source file on disk into a web-optimised MP4. Knows nothing about HTTP,
 * storage or the database — it takes two paths and the injected runner, which is
 * what makes it reusable (and testable with a fake runner).
 *
 * Temp-file lifecycle is the caller's job: `VideoService` owns the directory and
 * removes it in a `finally`, so a failure here never leaks bytes to disk.
 */
export class VideoCompressor {
  constructor(
    private readonly runner: FfmpegRunner,
    private readonly settings: CompressionSettings,
  ) {}

  get available(): boolean {
    return this.runner.isAvailable();
  }

  async compress(
    inputPath: string,
    outputPath: string,
    onProgress?: (fraction: number) => void,
  ): Promise<CompressResult> {
    if (!this.runner.isAvailable()) {
      throw videoError("VIDEO_TOOLING_UNAVAILABLE");
    }

    // Probing first doubles as validation: anything ffprobe can't read is rejected
    // as VIDEO_CORRUPT before we spend CPU on an encode.
    const probe = await this.runner.probe(inputPath, this.settings.timeoutMs);
    const args = buildCompressArgs(inputPath, outputPath, probe, this.settings);
    await this.runner.run(args, {
      timeoutMs: this.settings.timeoutMs,
      onProgress,
    });

    const { size } = await stat(outputPath);
    if (size === 0) throw videoError("VIDEO_ENCODING_FAILED");

    const { width, height } = scaledDimensions(
      probe.width,
      probe.height,
      this.settings.maxWidth,
    );
    return { outputPath, bytes: size, durationSec: probe.durationSec, width, height };
  }
}
