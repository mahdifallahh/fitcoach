/**
 * Monochrome brand glyphs for messengers lucide-react doesn't ship. They inherit
 * `currentColor`, so they tint like any other footer icon.
 */

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M11.94 2.02c-5.5 0-9.96 4.46-9.96 9.96s4.46 9.96 9.96 9.96 9.96-4.46 9.96-9.96-4.46-9.96-9.96-9.96Zm4.62 6.83-1.55 7.29c-.11.52-.42.64-.86.4l-2.38-1.75-1.15 1.11c-.13.13-.24.24-.48.24l.17-2.43 4.42-3.99c.19-.17-.04-.27-.3-.1l-5.46 3.44-2.35-.74c-.51-.16-.52-.51.11-.76l9.18-3.54c.42-.16.79.1.65.79Z" />
    </svg>
  );
}

/**
 * Bale (بله) — its real app icon is a green rounded-square badge with a white
 * chat-bubble/check mark, so (unlike the monochrome glyphs above) this one
 * keeps the brand's own color rather than inheriting `currentColor`.
 */
export function BaleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="#06C270" />
      <path
        d="M7 11.3a5 5 0 1 1 2.1 4.06.6.6 0 0 0-.6-.1l-1.6.44a.5.5 0 0 1-.61-.62l.46-1.58a.63.63 0 0 0-.09-.55A4.98 4.98 0 0 1 7 11.3Z"
        fill="#fff"
      />
      <path
        d="M9.3 11.5l1.5 1.5 3.1-3.3"
        fill="none"
        stroke="#06C270"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
