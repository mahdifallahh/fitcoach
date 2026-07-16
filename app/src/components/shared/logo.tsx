import Image from 'next/image';
import { cn } from '@/lib/utils';
import markSrc from '../../../public/brand/logo-mark.png';
import wordmarkSrc from '../../../public/brand/logo-wordmark.png';

const SIZES = {
  sm: { mark: 24, word: 64 },
  md: { mark: 30, word: 82 },
  lg: { mark: 40, word: 108 },
} as const;

/**
 * Wordmark aspect ratio, derived from the imported asset itself. Swapping the
 * PNGs in `public/brand/` (keeping the file names) is all it takes to rebrand —
 * every size below recomputes automatically, no code edit needed.
 */
const WORD_RATIO = wordmarkSrc.height / wordmarkSrc.width;

/**
 * fitlo brand lockup: the F mark + FITLO wordmark. `variant="mark"` shows just the
 * icon (tight spots / favicons); the default shows the horizontal lockup used in
 * the header, footer and app shell. The wordmark is a fixed brand asset, so it
 * stays Latin in both locales — `dir="ltr"` keeps its order correct inside RTL.
 */
export function Logo({
  variant = 'lockup',
  size = 'md',
  className,
  priority,
}: {
  variant?: 'lockup' | 'mark';
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}) {
  const s = SIZES[size];
  const lockup = variant === 'lockup';
  const wordHeight = Math.round(s.word * WORD_RATIO);

  return (
    // gap-1: the mark *is* the "f" — the wordmark is "itlo", so a letter-spacing
    // sized gap makes the lockup read as one word: fitlo.
    <span className={cn('inline-flex items-center gap-1', className)} dir="ltr">
      {/* In the lockup the wordmark already carries the name, so the mark is
          hidden from the a11y tree (aria-hidden) to avoid announcing "fitlo"
          twice — but it still gets a non-empty `alt` so crawlers/SEO checkers
          never see an image without alt text. */}
      <Image
        src={markSrc}
        alt="fitlo"
        aria-hidden={lockup || undefined}
        width={s.mark}
        height={s.mark}
        priority={priority}
        style={{ height: s.mark, width: 'auto' }}
      />
      {lockup && (
        <Image
          src={wordmarkSrc}
          alt="fitlo"
          width={s.word}
          height={wordHeight}
          priority={priority}
          style={{ height: wordHeight, width: 'auto' }}
        />
      )}
    </span>
  );
}
