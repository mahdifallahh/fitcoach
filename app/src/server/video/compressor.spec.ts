import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isAppError } from "../http/errors";
import type { CompressionSettings } from "./config";
import { buildCompressArgs, scaledDimensions, VideoCompressor } from "./compressor";
import { ffmpegCandidates, type FfmpegRunner, type VideoProbe } from "./ffmpeg";
import { videoError } from "./errors";

const settings: CompressionSettings = {
  crf: 28,
  preset: "veryfast",
  maxWidth: 1280,
  audioBitrateKbps: 96,
  timeoutMs: 300_000,
};

const probe: VideoProbe = {
  durationSec: 12,
  width: 1920,
  height: 1080,
  hasAudio: true,
  formatName: "mov,mp4,m4a",
};

/** Reads the value that follows a flag, the way ffmpeg parses its own argv. */
function argAfter(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

describe("buildCompressArgs", () => {
  const args = buildCompressArgs("/in.mov", "/out.mp4", probe, settings);

  it("encodes H.264 at the configured quality and preset", () => {
    expect(argAfter(args, "-c:v")).toBe("libx264");
    expect(argAfter(args, "-crf")).toBe("28");
    expect(argAfter(args, "-preset")).toBe("veryfast");
  });

  it("caps the width without ever upscaling, and keeps height even", () => {
    expect(argAfter(args, "-vf")).toBe("scale='min(1280,iw)':-2");
  });

  it("emits a web-playable file: faststart + a universally decodable pixel format", () => {
    expect(argAfter(args, "-movflags")).toBe("+faststart");
    expect(argAfter(args, "-pix_fmt")).toBe("yuv420p");
  });

  it("re-encodes audio at the configured bitrate when the source has sound", () => {
    expect(argAfter(args, "-c:a")).toBe("aac");
    expect(argAfter(args, "-b:a")).toBe("96k");
  });

  it("drops the audio track entirely when the source is silent", () => {
    const silent = buildCompressArgs("/in.mov", "/out.mp4", { hasAudio: false }, settings);
    expect(silent).toContain("-an");
    expect(silent).not.toContain("-c:a");
  });

  it("puts the output path last and never overwrites the input", () => {
    expect(args[args.length - 1]).toBe("/out.mp4");
    expect(argAfter(args, "-i")).toBe("/in.mov");
  });
});

describe("scaledDimensions", () => {
  it("leaves a clip that is already narrow enough untouched", () => {
    expect(scaledDimensions(720, 1280, 1280)).toEqual({ width: 720, height: 1280 });
  });

  it("scales proportionally and rounds to even numbers H.264 can encode", () => {
    expect(scaledDimensions(1920, 1080, 1280)).toEqual({ width: 1280, height: 720 });
    expect(scaledDimensions(1000, 563, 640)).toEqual({ width: 640, height: 360 });
  });
});

describe("ffmpegCandidates", () => {
  it("prefers PATH entries, so brew/winget/apt installs are found without config", () => {
    const paths = ffmpegCandidates("ffmpeg", "linux", { PATH: "/opt/tools:/usr/bin" });
    expect(paths[0]).toBe("/opt/tools/ffmpeg");
    expect(paths).toContain("/usr/bin/ffmpeg");
  });

  it("uses the .exe suffix on Windows", () => {
    const paths = ffmpegCandidates("ffmpeg", "win32", {
      PATH: "C:\\tools",
      PROGRAMFILES: "C:\\Program Files",
    });
    expect(paths).toContain("C:\\tools\\ffmpeg.exe");
    expect(paths).toContain("C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe");
  });

  it("falls back to the container's path when PATH is empty", () => {
    expect(ffmpegCandidates("ffprobe", "linux", {})).toContain("/usr/bin/ffprobe");
  });
});

// ── VideoCompressor, driven by a fake runner ────────────────────────────────
class FakeRunner implements FfmpegRunner {
  lastArgs: readonly string[] = [];
  constructor(
    private readonly behaviour: {
      available?: boolean;
      probeResult?: VideoProbe | Error;
      runError?: Error;
      /** Written to the output path so the size check has something to read. */
      output?: string;
    } = {},
  ) {}
  async isAvailable() {
    return this.behaviour.available ?? true;
  }
  async probe(): Promise<VideoProbe> {
    const result = this.behaviour.probeResult ?? probe;
    if (result instanceof Error) throw result;
    return result;
  }
  async run(args: readonly string[]): Promise<void> {
    this.lastArgs = args;
    if (this.behaviour.runError) throw this.behaviour.runError;
    const outputPath = args[args.length - 1];
    await writeFile(outputPath, this.behaviour.output ?? "fake-mp4-bytes");
  }
}

describe("VideoCompressor", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fitlo-compressor-test-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("probes, encodes and reports the post-scale dimensions", async () => {
    const runner = new FakeRunner();
    const compressor = new VideoCompressor(runner, settings);
    const result = await compressor.compress(join(dir, "in.mov"), join(dir, "out.mp4"));

    expect(result.bytes).toBeGreaterThan(0);
    expect(result.durationSec).toBe(12);
    // 1920x1080 source, 1280 cap → the stored size must reflect the scale, not the source.
    expect(result).toMatchObject({ width: 1280, height: 720 });
  });

  it("reports the tooling as unavailable instead of spawning nothing", async () => {
    const compressor = new VideoCompressor(new FakeRunner({ available: false }), settings);
    await expect(
      compressor.compress(join(dir, "in.mov"), join(dir, "out.mp4")),
    ).rejects.toMatchObject({ code: "VIDEO_TOOLING_UNAVAILABLE" });
  });

  it("surfaces a corrupt source from the probe stage, before any encoding", async () => {
    const runner = new FakeRunner({ probeResult: videoError("VIDEO_CORRUPT") });
    const compressor = new VideoCompressor(runner, settings);
    await expect(
      compressor.compress(join(dir, "in.mov"), join(dir, "out.mp4")),
    ).rejects.toMatchObject({ code: "VIDEO_CORRUPT" });
    expect(runner.lastArgs).toHaveLength(0);
  });

  it("propagates a timeout as a typed error, not a raw throw", async () => {
    const runner = new FakeRunner({ runError: videoError("VIDEO_TIMEOUT") });
    const compressor = new VideoCompressor(runner, settings);
    const err = await compressor
      .compress(join(dir, "in.mov"), join(dir, "out.mp4"))
      .catch((e) => e);
    expect(isAppError(err)).toBe(true);
    expect(err.code).toBe("VIDEO_TIMEOUT");
  });

  it("treats a zero-byte result as a failed encode", async () => {
    const runner = new FakeRunner({ output: "" });
    const compressor = new VideoCompressor(runner, settings);
    await expect(
      compressor.compress(join(dir, "in.mov"), join(dir, "out.mp4")),
    ).rejects.toMatchObject({ code: "VIDEO_ENCODING_FAILED" });
  });
});
