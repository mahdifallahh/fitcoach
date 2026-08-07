import {
  GIF_FPS,
  GIF_MAX_FRAMES,
  GIF_MAX_SECONDS,
  GIF_MAX_WIDTH,
} from "./gif-settings";
import type { EncoderRequest, EncoderResponse } from "./gif-encoder.worker";

export class VideoConversionError extends Error {
  constructor(readonly reason: "decode" | "empty" | "encode" | "aborted") {
    super(reason);
    this.name = "VideoConversionError";
  }
}

export interface ConvertOptions {
  /** 0 → 1, for a progress bar. */
  onProgress?: (fraction: number) => void;
  /** Abort when the dialog that started this closes. */
  signal?: AbortSignal;
}

/**
 * Turn a phone video into a small looping GIF, entirely in the browser.
 *
 * Why not on the server: the requirement is that ten coaches uploading at once
 * must not stall the app. Server-side transcoding makes concurrency the API's
 * problem — ten ffmpeg processes on one container, each holding the whole clip,
 * with every coach's raw video crossing mobile data first. Converting here makes
 * concurrency disappear instead of scaling: the work happens on the ten phones
 * that shot the ten videos, and the server only ever receives a finished file a
 * few hundred kilobytes long.
 *
 * Frames are taken by seeking rather than by playing the video and sampling with
 * rAF. Playback sampling drops and duplicates frames unpredictably when the tab
 * is busy or backgrounded — which is exactly when a conversion is running — and
 * mobile Safari refuses to play an inline video without a user gesture at all.
 * Seeking is slower per frame and gives the same result every time.
 */
export async function videoToGif(
  file: File,
  options: ConvertOptions = {},
): Promise<Blob> {
  const { onProgress, signal } = options;
  const video = await loadVideo(file, signal);

  try {
    const duration = Math.min(video.duration || 0, GIF_MAX_SECONDS);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new VideoConversionError("empty");
    }

    const { width, height } = scaleToFit(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    // `willReadFrequently` — every single frame is read straight back out, which
    // is the case this hint exists for; without it the browser keeps the canvas
    // on the GPU and each getImageData pays a full readback.
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new VideoConversionError("decode");

    const frameCount = Math.max(
      1,
      Math.min(GIF_MAX_FRAMES, Math.floor(duration * GIF_FPS)),
    );
    const delayMs = 1000 / GIF_FPS;

    const worker = createEncoderWorker();
    const finished = collectGif(worker, signal);

    try {
      for (let index = 0; index < frameCount; index++) {
        throwIfAborted(signal);
        await seekTo(video, (index * duration) / frameCount);
        ctx.drawImage(video, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);
        // Transfer the pixel buffer instead of copying it: at 320×180 that is
        // 230 KB per frame, and the main thread has no use for it afterwards.
        const buffer = data.buffer as ArrayBuffer;
        send(worker, { type: "frame", data: buffer, width, height, delayMs }, [
          buffer,
        ]);
        onProgress?.((index + 1) / frameCount);
      }
      send(worker, { type: "finish" });
      return await finished;
    } finally {
      worker.terminate();
    }
  } finally {
    URL.revokeObjectURL(video.src);
  }
}

// ── plumbing ────────────────────────────────────────────────────────────────

function createEncoderWorker(): Worker {
  // The `new URL(..., import.meta.url)` form is what lets the bundler find and
  // emit the worker as its own chunk; a plain string path would not be traced.
  return new Worker(new URL("./gif-encoder.worker.ts", import.meta.url));
}

function send(
  worker: Worker,
  message: EncoderRequest,
  transfer: Transferable[] = [],
) {
  worker.postMessage(message, transfer);
}

function collectGif(worker: Worker, signal?: AbortSignal): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const abort = () => reject(new VideoConversionError("aborted"));
    signal?.addEventListener("abort", abort, { once: true });

    worker.onmessage = (event: MessageEvent<EncoderResponse>) => {
      const message = event.data;
      if (message.type === "done") {
        signal?.removeEventListener("abort", abort);
        resolve(new Blob([message.gif], { type: "image/gif" }));
      } else if (message.type === "error") {
        signal?.removeEventListener("abort", abort);
        reject(new VideoConversionError("encode"));
      }
    };
    worker.onerror = () => reject(new VideoConversionError("encode"));
  });
}

/** Load metadata + the first frame; rejects on anything the browser can't decode. */
function loadVideo(
  file: File,
  signal?: AbortSignal,
): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    // Required for iOS Safari to decode without going fullscreen.
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    const fail = () => {
      URL.revokeObjectURL(video.src);
      reject(new VideoConversionError("decode"));
    };
    video.onerror = fail;
    signal?.addEventListener("abort", fail, { once: true });
    // `loadeddata` rather than `loadedmetadata`: metadata alone gives dimensions
    // but no decoded picture, and drawing then yields a blank first frame.
    video.onloadeddata = () => resolve(video);
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    video.onerror = () => reject(new VideoConversionError("decode"));
    video.currentTime = time;
  });
}

/** Fit inside the width budget, keeping the aspect ratio and an even height. */
function scaleToFit(sourceWidth: number, sourceHeight: number) {
  if (!sourceWidth || !sourceHeight) throw new VideoConversionError("empty");
  const scale = Math.min(1, GIF_MAX_WIDTH / sourceWidth);
  return {
    width: Math.max(2, Math.round(sourceWidth * scale)),
    height: Math.max(2, Math.round(sourceHeight * scale)),
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new VideoConversionError("aborted");
}
