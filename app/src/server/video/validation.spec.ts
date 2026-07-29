import { isAppError } from "../http/errors";
import type { VideoLimits } from "./config";
import { VIDEO_EXTENSIONS, VIDEO_MIME_TYPES } from "./config";
import {
  fileExtension,
  sanitizeFilename,
  validateUpload,
} from "./validation";

const limits: VideoLimits = {
  maxBytes: 100 * 1024 * 1024,
  mimeTypes: VIDEO_MIME_TYPES,
  extensions: VIDEO_EXTENSIONS,
};

/** The `code` of the thrown AppError, so tests assert behaviour not messages. */
function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    if (isAppError(err)) return err.code;
    throw err;
  }
  throw new Error("expected a rejection, got none");
}

describe("fileExtension", () => {
  it("lowercases and keeps the dot", () => {
    expect(fileExtension("Squat.MP4")).toBe(".mp4");
  });

  it("returns null when there is no usable extension", () => {
    expect(fileExtension("squat")).toBeNull();
    expect(fileExtension("squat.")).toBeNull();
    expect(fileExtension(".gitignore")).toBeNull(); // dotfile, not an extension
  });
});

describe("sanitizeFilename", () => {
  it("strips directory traversal so a name can never escape its key prefix", () => {
    expect(sanitizeFilename("../../etc/passwd.mp4")).toBe("passwd.mp4");
    expect(sanitizeFilename("C:\\videos\\squat.mp4")).toBe("squat.mp4");
  });

  it("drops characters that are illegal in an object key", () => {
    expect(sanitizeFilename('sq"u<a>t|.mp4')).toBe("squat.mp4");
  });
});

describe("validateUpload", () => {
  it("accepts each documented format with a matching extension", () => {
    const cases: Array<[string, string]> = [
      ["video/mp4", "squat.mp4"],
      ["video/quicktime", "squat.mov"],
      ["video/webm", "squat.webm"],
      ["video/x-msvideo", "squat.avi"],
    ];
    for (const [contentType, filename] of cases) {
      const result = validateUpload(
        { contentType, filename, declaredBytes: 1024 },
        limits,
      );
      expect(result.contentType).toBe(contentType);
    }
  });

  it("ignores charset parameters and casing on the content type", () => {
    const result = validateUpload(
      { contentType: "VIDEO/MP4; codecs=avc1", filename: "a.MP4", declaredBytes: 10 },
      limits,
    );
    expect(result.contentType).toBe("video/mp4");
    expect(result.extension).toBe(".mp4");
  });

  it("rejects a non-video content type", () => {
    expect(
      codeOf(() =>
        validateUpload(
          { contentType: "application/zip", filename: "a.zip", declaredBytes: 10 },
          limits,
        ),
      ),
    ).toBe("VIDEO_TYPE_NOT_ALLOWED");
  });

  it("rejects an extension that contradicts the declared type", () => {
    // A .zip renamed to pass as MP4: the MIME check alone would let it through,
    // which is exactly why both halves are required.
    expect(
      codeOf(() =>
        validateUpload(
          { contentType: "video/mp4", filename: "payload.zip", declaredBytes: 10 },
          limits,
        ),
      ),
    ).toBe("VIDEO_EXTENSION_MISMATCH");
  });

  it("rejects a declared size over the ceiling before any bytes are read", () => {
    expect(
      codeOf(() =>
        validateUpload(
          {
            contentType: "video/mp4",
            filename: "big.mp4",
            declaredBytes: limits.maxBytes + 1,
          },
          limits,
        ),
      ),
    ).toBe("VIDEO_TOO_LARGE");
  });

  it("still accepts a request with no Content-Length (the stream cap covers it)", () => {
    expect(
      validateUpload(
        { contentType: "video/mp4", filename: "a.mp4", declaredBytes: null },
        limits,
      ).filename,
    ).toBe("a.mp4");
  });

  it("rejects a missing filename or content type", () => {
    expect(
      codeOf(() =>
        validateUpload({ contentType: null, filename: "a.mp4", declaredBytes: 1 }, limits),
      ),
    ).toBe("VIDEO_EMPTY");
    expect(
      codeOf(() =>
        validateUpload({ contentType: "video/mp4", filename: null, declaredBytes: 1 }, limits),
      ),
    ).toBe("VIDEO_EMPTY");
  });
});
