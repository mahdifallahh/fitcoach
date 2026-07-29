import "server-only";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { videoError } from "./errors";

/** What ffprobe tells us about the source file. */
export interface VideoProbe {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  /** Container/format name as ffprobe reports it, e.g. "mov,mp4,m4a,3gp,3g2,mj2". */
  formatName: string;
}

export interface RunOptions {
  timeoutMs: number;
  /** Called with 0–1 as encoding advances, when the total duration is known. */
  onProgress?: (fraction: number) => void;
}

/**
 * The only surface the compressor needs from the outside world. Injecting this
 * interface (rather than calling `spawn` inline) is what lets the compressor be
 * unit-tested without ffmpeg installed — see `compressor.spec.ts`.
 */
export interface FfmpegRunner {
  /** True when both binaries were found on this host. */
  isAvailable(): boolean;
  probe(inputPath: string, timeoutMs: number): Promise<VideoProbe>;
  run(args: readonly string[], options: RunOptions): Promise<void>;
}

/**
 * Where ffmpeg/ffprobe usually live, per platform. Same idea as the PDF
 * service's Chromium lookup: one `.env` is shared by the Linux container and a
 * native Windows/macOS dev run, so a configured path that isn't on disk must not
 * be fatal. Pure (platform + env are arguments) so it is unit-testable.
 */
export function ffmpegCandidates(
  binary: "ffmpeg" | "ffprobe",
  platform: NodeJS.Platform,
  env: Record<string, string | undefined> = process.env,
): string[] {
  const windows = platform === "win32";
  const exe = windows ? `${binary}.exe` : binary;
  // Derived from the `platform` argument, never from the host: the function must
  // answer for a platform it isn't running on, or it can't be tested.
  const separator = windows ? "\\" : "/";
  const pathDelimiter = windows ? ";" : ":";
  /** Joins segments for the *target* platform, tolerating a trailing slash. */
  const path = (...segments: string[]) =>
    segments.map((s) => s.replace(/[\\/]+$/, "")).join(separator);

  // Anything on PATH wins after explicit config — that covers Homebrew, winget,
  // scoop, choco and a plain `apt install ffmpeg` without hardcoding their roots.
  const fromPath = (env.PATH ?? "")
    .split(pathDelimiter)
    .filter(Boolean)
    .map((dir) => path(dir, exe));

  if (windows) {
    const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA]
      .filter((r): r is string => !!r)
      .map((root) => path(root, "ffmpeg", "bin", exe));
    return [...fromPath, ...roots];
  }
  if (platform === "darwin") {
    return [...fromPath, `/opt/homebrew/bin/${exe}`, `/usr/local/bin/${exe}`];
  }
  return [...fromPath, `/usr/bin/${exe}`, `/usr/local/bin/${exe}`];
}

/** ffprobe's `-show_streams -show_format -of json` output, narrowed to what we read. */
interface ProbeJson {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
  }>;
  format?: { duration?: string; format_name?: string };
}

/** `out_time_ms=12345` lines from `-progress pipe:1`. */
const PROGRESS_TIME = /out_time_ms=(\d+)/g;

/**
 * Runs the real binaries. Resolution order per binary: the configured path (only
 * if it exists on disk) → PATH → the platform's usual locations.
 */
export class SpawnFfmpegRunner implements FfmpegRunner {
  private readonly ffmpeg?: string;
  private readonly ffprobe?: string;
  /** Set once the source duration is known, so `run` can report progress. */
  private totalDurationSec = 0;

  constructor(configured: { ffmpegPath?: string; ffprobePath?: string } = {}) {
    this.ffmpeg = resolveBinary("ffmpeg", configured.ffmpegPath);
    this.ffprobe = resolveBinary("ffprobe", configured.ffprobePath);
  }

  isAvailable(): boolean {
    return !!this.ffmpeg && !!this.ffprobe;
  }

  async probe(inputPath: string, timeoutMs: number): Promise<VideoProbe> {
    if (!this.ffprobe) throw videoError("VIDEO_TOOLING_UNAVAILABLE");
    const { stdout, code } = await exec(
      this.ffprobe,
      [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        inputPath,
      ],
      { timeoutMs },
    );
    if (code !== 0) throw videoError("VIDEO_CORRUPT");

    let parsed: ProbeJson;
    try {
      parsed = JSON.parse(stdout) as ProbeJson;
    } catch {
      throw videoError("VIDEO_CORRUPT");
    }

    const video = parsed.streams?.find((s) => s.codec_type === "video");
    // No video stream means it isn't a video at all: an .mp4-renamed archive, an
    // audio-only file, or a truncated download.
    if (!video?.width || !video.height) throw videoError("VIDEO_CORRUPT");

    this.totalDurationSec = Number(parsed.format?.duration ?? 0) || 0;
    return {
      durationSec: this.totalDurationSec,
      width: video.width,
      height: video.height,
      hasAudio: !!parsed.streams?.some((s) => s.codec_type === "audio"),
      formatName: parsed.format?.format_name ?? "",
    };
  }

  async run(args: readonly string[], options: RunOptions): Promise<void> {
    if (!this.ffmpeg) throw videoError("VIDEO_TOOLING_UNAVAILABLE");
    const total = this.totalDurationSec;
    const { code, timedOut, stderr } = await exec(this.ffmpeg, args, {
      timeoutMs: options.timeoutMs,
      onStdout:
        options.onProgress && total > 0
          ? (chunk) => {
              for (const m of chunk.matchAll(PROGRESS_TIME)) {
                const seconds = Number(m[1]) / 1_000_000;
                options.onProgress?.(Math.min(1, seconds / total));
              }
            }
          : undefined,
    });

    if (timedOut) throw videoError("VIDEO_TIMEOUT");
    if (code !== 0) {
      // ffmpeg's own last words are the only useful diagnostic here; keep them in
      // the server log, never in the client response.
      console.error("[video] ffmpeg failed:", stderr.slice(-2000));
      throw videoError("VIDEO_ENCODING_FAILED");
    }
  }
}

function resolveBinary(
  binary: "ffmpeg" | "ffprobe",
  configured?: string,
): string | undefined {
  return [configured, ...ffmpegCandidates(binary, process.platform)].find(
    (p): p is string => !!p && existsSync(p),
  );
}

interface ExecResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * `spawn` wrapped in a promise with a hard timeout. stdout/stderr are capped so a
 * chatty or looping process can't grow unbounded in memory.
 */
function exec(
  command: string,
  args: readonly string[],
  opts: { timeoutMs: number; onStdout?: (chunk: string) => void },
): Promise<ExecResult> {
  const MAX_CAPTURE = 64 * 1024;
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeoutMs);

    child.stdout.on("data", (buf: Buffer) => {
      const chunk = buf.toString();
      opts.onStdout?.(chunk);
      if (stdout.length < MAX_CAPTURE) stdout += chunk;
    });
    child.stderr.on("data", (buf: Buffer) => {
      if (stderr.length < MAX_CAPTURE) stderr += buf.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}
