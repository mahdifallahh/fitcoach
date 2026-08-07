/**
 * `gifenc` ships no type declarations. Rather than let the module fall back to
 * `any` — which would silently swallow a wrong argument order in the encoder
 * worker, where nothing else would catch it — this declares the exact surface
 * the worker uses, and nothing more.
 */
declare module 'gifenc' {
  /** `[r, g, b]` triples; GIF allows at most 256 of them per frame. */
  export type Palette = number[][];

  export interface WriteFrameOptions {
    palette?: Palette;
    /** Frame delay in hundredths of a second, as the GIF format stores it. */
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    repeat?: number;
  }

  export interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions,
    ): void;
    finish(): void;
    /** A view onto the encoder's own buffer — copy before transferring it. */
    bytesView(): Uint8Array;
    bytes(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder;

  /** Fit a palette of at most `maxColors` to these RGBA pixels. */
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: 'rgb565' | 'rgb444' | 'rgba4444'; oneBitAlpha?: boolean; clearAlpha?: boolean },
  ): Palette;

  /** Map RGBA pixels onto `palette`, returning one index per pixel. */
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;
}
