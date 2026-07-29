import "server-only";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import type { StorageService } from "../storage";
import type { VideoCompressor } from "./compressor";
import { OUTPUT_CONTENT_TYPE, OUTPUT_EXTENSION, type VideoConfig } from "./config";
import { videoError } from "./errors";
import { validateUpload, type UploadDescriptor } from "./validation";

export interface StoredVideo {
  /** Public URL of the compressed MP4. */
  url: string;
  /** Size after compression. */
  bytes: number;
  /** Size as uploaded, so the UI can show what was saved. */
  originalBytes: number;
  durationSec: number;
  width: number;
  height: number;
}

/**
 * Orchestrates one exercise-video upload: validate → stream to a temp file →
 * compress → store → clean up.
 *
 * Every collaborator is injected (storage, compressor, config) so the whole flow
 * can be exercised with fakes. Nothing here touches HTTP: the route hands over a
 * byte stream and a descriptor, which keeps the handler thin and this testable.
 */
export class VideoService {
  constructor(
    private readonly storage: StorageService,
    private readonly compressor: VideoCompressor,
    private readonly config: VideoConfig,
  ) {}

  get limits() {
    return this.config.limits;
  }

  /**
   * @param source  Request body. A stream, never a Buffer — a 100 MB upload must
   *                not sit in the server's heap.
   * @param keyPrefix Object-key prefix, i.e. the owning coach's id.
   */
  async ingest(
    source: Readable | ReadableStream<Uint8Array>,
    descriptor: UploadDescriptor,
    keyPrefix: string,
  ): Promise<StoredVideo> {
    const { extension } = validateUpload(descriptor, this.config.limits);

    // One directory per request, named by UUID: concurrent uploads can never
    // collide on a filename, and cleanup is a single recursive remove.
    const workDir = join(tmpdir(), "fitlo-video", randomUUID());
    const inputPath = join(workDir, `source${extension}`);
    const outputPath = join(workDir, `output${OUTPUT_EXTENSION}`);

    try {
      await mkdir(workDir, { recursive: true });
      const originalBytes = await this.writeCapped(source, inputPath);
      if (originalBytes === 0) throw videoError("VIDEO_EMPTY");

      const result = await this.compressor.compress(inputPath, outputPath);
      const key = `${keyPrefix}/${randomUUID()}${OUTPUT_EXTENSION}`;

      // The upload streams from disk rather than buffering the file. Close the
      // handle explicitly afterwards: if the upload throws part-way the stream is
      // left open, and an open handle makes the `finally` cleanup below fail on
      // Windows (EBUSY) — leaking a temp file per failed upload.
      const body = createReadStream(outputPath);
      let url: string;
      try {
        url = await this.storage.putStream(
          "videos",
          key,
          body,
          OUTPUT_CONTENT_TYPE,
          result.bytes,
        );
      } finally {
        body.destroy();
      }

      return {
        url,
        bytes: result.bytes,
        originalBytes,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
      };
    } finally {
      // Runs on success, on a rejected upload and on a crashed ffmpeg alike —
      // temp files are never left behind on a busy server.
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Streams the body to disk, aborting the moment it exceeds the ceiling. The cap
   * is enforced here — not from `Content-Length` — because a client can lie about
   * or omit that header; this counts the bytes that actually arrive.
   */
  private async writeCapped(
    source: Readable | ReadableStream<Uint8Array>,
    destination: string,
  ): Promise<number> {
    const readable =
      source instanceof Readable
        ? source
        : Readable.fromWeb(source as Parameters<typeof Readable.fromWeb>[0]);

    const max = this.config.limits.maxBytes;
    let received = 0;
    let exceeded = false;

    readable.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > max && !exceeded) {
        exceeded = true;
        readable.destroy(
          videoError("VIDEO_TOO_LARGE", { maxBytes: max }),
        );
      }
    });

    try {
      await pipeline(readable, createWriteStream(destination));
    } catch (err) {
      if (exceeded) throw videoError("VIDEO_TOO_LARGE", { maxBytes: max });
      throw err;
    }

    const { size } = await stat(destination);
    return size;
  }
}
