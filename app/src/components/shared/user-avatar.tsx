import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-14 text-base',
} as const;

/**
 * Profile picture with a graceful fallback chain: uploaded avatar → initials →
 * a generic person glyph. Avatars are user uploads on S3/MinIO, so a plain
 * `<img>` is used rather than `next/image` (no optimizer allowlist to maintain
 * for arbitrary tenant hosts).
 */
export function UserAvatar({
  src,
  name,
  size = 'md',
  className,
}: {
  src?: string | null;
  /** Display name; its first letters become the fallback initials. */
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted font-semibold uppercase text-muted-foreground',
    SIZES[size],
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" className={cn(base, 'object-cover')} />
    );
  }

  const initials = toInitials(name);
  return (
    <span className={base} aria-hidden>
      {initials || <User className="size-1/2" />}
    </span>
  );
}

/**
 * Up to two initials from a display name. Returns '' for names that carry no
 * letters — a brand-new coach's name defaults to their phone number, and "09"
 * as initials looks like a bug, so those fall through to the glyph.
 */
function toInitials(name?: string | null): string {
  if (!name) return '';
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  if (words.length === 0) return '';
  return words
    .slice(0, 2)
    .map((w) => [...w][0])
    .join('');
}
