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

/** Bale (بله) — approximated by its rounded-square paper-plane mark. */
export function BaleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M6 2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Zm11.3 5.1L7.2 10.9c-.5.19-.49.53.02.68l2.55.8 1.03 3.2c.13.4.37.44.61.2l1.34-1.3 2.6 1.93c.32.24.65.11.73-.34l1.5-8.06c.11-.55-.24-.8-.6-.6Z" />
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
