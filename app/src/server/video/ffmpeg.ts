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
  /**
   * True when both binaries were found. Async because locating them touches the
   * filesystem and may load the bundled-binary packages — work that does not
   * belong in a constructor, and that must be allowed to fail softly.
   */
  isAvailable(): Promise<boolean>;
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
 * if it exists on disk) → PATH → the platform's usual locations → the copy that
 * ships in node_modules.
 *
 * That last step is what lets the app run on a managed Node host, which has no
 * ffmpeg and no way to `apt install` one. A system binary still wins when there
 * is one: it is newer and faster than the bundled build, so the Docker image
 * keeps using its own and only a bare host falls back.
 */
export class SpawnFfmpegRunner implements FfmpegRunner {
  /** Memoised — the lookup hits the filesystem and loads the fallback packages. */
  private binaries?: Promise<{ ffmpeg?: string; ffprobe?: string }>;
  /** Set once the source duration is known, so `run` can report progress. */
  private totalDurationSec = 0;

  constructor(
    private readonly configured: {
      ffmpegPath?: string;
      ffprobePath?: string;
    } = {},
  ) {}

  private resolve() {
    this.binaries ??= resolveBinaries(this.configured);
    return this.binaries;
  }

  async isAvailable(): Promise<boolean> {
    const { ffmpeg, ffprobe } = await this.resolve();
    return !!ffmpeg && !!ffprobe;
  }

  async probe(inputPath: string, timeoutMs: number): Promise<VideoProbe> {
    const { ffprobe } = await this.resolve();
    if (!ffprobe) throw videoError("VIDEO_TOOLING_UNAVAILABLE");
    const { stdout, code } = await exec(
      ffprobe,
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
    const { ffmpeg } = await this.resolve();
    if (!ffmpeg) throw videoError("VIDEO_TOOLING_UNAVAILABLE");
    const total = this.totalDurationSec;
    const { code, timedOut, stderr } = await exec(ffmpeg, args, {
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

/** What `@ffmpeg-installer` / `@ffprobe-installer` expose. */
interface InstalledBinary {
  path: string;
}

/**
 * ffmpeg + ffprobe shipped inside node_modules, for a host that has neither and
 * no way to install one. Both packages deliver their binary as a platform-specific
 * `optionalDependency`, so nothing is downloaded at install time beyond the registry
 * fetch that installed everything else — which matters on a network where a
 * postinstall reach-out to GitHub is the first thing to fail.
 *
 * The specifiers are literal so Next's output tracing copies the packages into the
 * build, and a load failure is swallowed on purpose: an unsupported platform must
 * degrade to a 503 on upload, never take the server down at boot.
 */
async function packagedBinaries(): Promise<{
  ffmpeg?: string;
  ffprobe?: string;
}> {
  const pathOf = (mod: unknown): string =>
    ((mod as { default?: InstalledBinary }).default ?? (mod as InstalledBinary))
      .path;
  const [ffmpeg, ffprobe] = await Promise.all([
    import("@ffmpeg-installer/ffmpeg")
      .then(pathOf)
      .catch(() => undefined),
    import("@ffprobe-installer/ffprobe")
      .then(pathOf)
      .catch(() => undefined),
  ]);
  return { ffmpeg, ffprobe };
}

async function resolveBinaries(configured: {
  ffmpegPath?: string;
  ffprobePath?: string;
}): Promise<{ ffmpeg?: string; ffprobe?: string }> {
  const packaged = await packagedBinaries();
  return {
    ffmpeg: pickBinary("ffmpeg", configured.ffmpegPath, packaged.ffmpeg),
    ffprobe: pickBinary("ffprobe", configured.ffprobePath, packaged.ffprobe),
  };
}

/**
 * First candidate that is actually on disk. A configured path that does not exist
 * is skipped rather than fatal — one `.env` is shared by the container and a native
 * dev run — and the bundled copy sits last so a real system binary always wins.
 */
function pickBinary(
  binary: "ffmpeg" | "ffprobe",
  configured?: string,
  packaged?: string,
): string | undefined {
  return [
    configured,
    ...ffmpegCandidates(binary, process.platform),
    packaged,
  ].find((p): p is string => !!p && existsSync(p));
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
