import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { VideoConfig } from "./config";
import { VIDEO_EXTENSIONS, VIDEO_MIME_TYPES } from "./config";
import { videoError } from "./errors";
import { VideoService } from "./service";

const config: VideoConfig = {
  limits: {
    maxBytes: 1024, // tiny, so the cap is easy to cross in a test
    mimeTypes: VIDEO_MIME_TYPES,
    extensions: VIDEO_EXTENSIONS,
  },
  compression: {
    crf: 28,
    preset: "veryfast",
    maxWidth: 1280,
    audioBitrateKbps: 96,
    timeoutMs: 1000,
  },
};

const descriptor = {
  contentType: "video/mp4",
  filename: "squat.mp4",
  declaredBytes: null,
};

/** Compressor stub: copies nothing, just reports a plausible result. */
function fakeCompressor(behaviour: { error?: Error } = {}) {
  return {
    available: true,
    compress: jest.fn(async (_input: string, outputPath: string) => {
      if (behaviour.error) throw behaviour.error;
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outputPath, "compressed");
      return {
        outputPath,
        bytes: 10,
        durationSec: 5,
        width: 1280,
        height: 720,
      };
    }),
  };
}

function fakeStorage() {
  return {
    putStream: jest.fn(async (_kind, key: string) => `https://cdn.test/videos/${key}`),
  };
}

/** How many per-request working directories are currently on disk. */
async function tempDirCount(): Promise<number> {
  return readdir(join(tmpdir(), "fitlo-video"))
    .then((entries) => entries.length)
    .catch(() => 0);
}

describe("VideoService.ingest", () => {
  it("stores the compressed clip under the coach's prefix and reports both sizes", async () => {
    const storage = fakeStorage();
    const compressor = fakeCompressor();
    const service = new VideoService(storage as never, compressor as never, config);

    const result = await service.ingest(
      Readable.from([Buffer.alloc(200, 1)]),
      descriptor,
      "coach1",
    );

    expect(result.originalBytes).toBe(200);
    expect(result.bytes).toBe(10);
    expect(result.url).toMatch(/^https:\/\/cdn\.test\/videos\/coach1\//);
    expect(result.url.endsWith(".mp4")).toBe(true);
    expect(storage.putStream).toHaveBeenCalledTimes(1);
  });

  it("aborts mid-stream once the body passes the ceiling", async () => {
    const service = new VideoService(
      fakeStorage() as never,
      fakeCompressor() as never,
      config,
    );
    // Two chunks: the first fits, the second crosses the 1 KB cap.
    const body = Readable.from([Buffer.alloc(600, 1), Buffer.alloc(600, 1)]);

    await expect(service.ingest(body, descriptor, "coach1")).rejects.toMatchObject({
      code: "VIDEO_TOO_LARGE",
    });
  });

  it("rejects an unsupported format before touching the disk", async () => {
    const compressor = fakeCompressor();
    const service = new VideoService(fakeStorage() as never, compressor as never, config);

    await expect(
      service.ingest(Readable.from([Buffer.alloc(10)]), {
        ...descriptor,
        contentType: "application/zip",
        filename: "a.zip",
      }, "coach1"),
    ).rejects.toMatchObject({ code: "VIDEO_TYPE_NOT_ALLOWED" });
    expect(compressor.compress).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    const service = new VideoService(
      fakeStorage() as never,
      fakeCompressor() as never,
      config,
    );
    await expect(
      service.ingest(Readable.from([]), descriptor, "coach1"),
    ).rejects.toMatchObject({ code: "VIDEO_EMPTY" });
  });

  it("leaves no temp files behind when compression fails", async () => {
    const before = await tempDirCount();
    const service = new VideoService(
      fakeStorage() as never,
      fakeCompressor({ error: videoError("VIDEO_ENCODING_FAILED") }) as never,
      config,
    );

    await expect(
      service.ingest(Readable.from([Buffer.alloc(100)]), descriptor, "coach1"),
    ).rejects.toMatchObject({ code: "VIDEO_ENCODING_FAILED" });

    expect(await tempDirCount()).toBe(before);
  });

  it("leaves no temp files behind on success either", async () => {
    const before = await tempDirCount();
    const service = new VideoService(
      fakeStorage() as never,
      fakeCompressor() as never,
      config,
    );
    await service.ingest(Readable.from([Buffer.alloc(100)]), descriptor, "coach1");
    expect(await tempDirCount()).toBe(before);
  });
});
