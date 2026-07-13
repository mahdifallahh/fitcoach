'use client';

import { useEffect } from 'react';

/**
 * Catches uncaught render/runtime errors anywhere under a locale segment so the
 * user sees a recoverable message instead of Next's dev overlay or a blank page.
 * Kept dependency-light (no next-intl, no UI kit) so it renders even if whatever
 * broke the page also broke a shared provider higher up the tree.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold">مشکلی پیش اومد / Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        لطفاً دوباره تلاش کن یا صفحه را رفرش کن. / Please try again or refresh the page.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        تلاش دوباره / Try again
      </button>
    </div>
  );
}
