/// <reference lib="webworker" />
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { GIF_PALETTE_SIZE } from './gif-settings';

/**
 * GIF encoding, off the main thread.
 *
 * Quantizing 40 frames to a 256-colour palette is tens of millions of distance
 * comparisons. On the main thread that freezes the tab — no scrolling, no
 * cancelling, and on a mid-range phone the browser offers to kill the page. The
 * work is identical here; the difference is that the coach can still use the UI
 * while it runs.
 *
 * Frames are streamed in one at a time rather than sent as a batch, so peak
 * memory stays at a single frame instead of the whole clip, and encoding
 * overlaps with the decoding still happening on the other side.
 */

export type EncoderRequest =
  | { type: 'frame'; data: ArrayBuffer; width: number; height: number; delayMs: number }
  | { type: 'finish' };

/**
 * No progress message: the visible bar is driven by the decode loop on the other
 * side, which is where the time actually goes — seeking a video 40 times on a
 * phone dwarfs the ~300 ms this spends encoding them.
 */
export type EncoderResponse =
  | { type: 'done'; gif: ArrayBuffer }
  | { type: 'error'; message: string };

const encoder = GIFEncoder();

self.onmessage = (event: MessageEvent<EncoderRequest>) => {
  try {
    const message = event.data;

    if (message.type === 'frame') {
      const pixels = new Uint8ClampedArray(message.data);
      // Per-frame palette, not one shared palette: an exercise clip pans and the
      // lighting shifts, and a palette fitted to frame one smears the rest.
      const palette = quantize(pixels, GIF_PALETTE_SIZE);
      const indexed = applyPalette(pixels, palette);
      encoder.writeFrame(indexed, message.width, message.height, {
        palette,
        // gifenc counts delay in hundredths of a second.
        delay: Math.round(message.delayMs / 10),
      });
      return;
    }

    encoder.finish();
    const gif = encoder.bytesView();
    // Copy out of the encoder's buffer before transferring: `bytesView` is a
    // view onto memory the encoder still owns, and transferring it directly
    // would detach the buffer underneath it.
    const out = new Uint8Array(gif.length);
    out.set(gif);
    post({ type: 'done', gif: out.buffer }, [out.buffer]);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

function post(message: EncoderResponse, transfer: Transferable[] = []) {
  (self as unknown as Worker).postMessage(message, transfer);
}
