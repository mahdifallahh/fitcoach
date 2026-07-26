'use client';

import * as React from 'react';

/**
 * Page state for a filtered list.
 *
 * Returns to page 1 whenever the filters change — without this, searching while
 * on page 3 asks the server for page 3 of a much shorter result set and the user
 * gets an empty list. `resetKey` should be every filter value the query depends
 * on, joined into a string.
 */
export function usePaged(resetKey: string): [number, (page: number) => void] {
  const [page, setPage] = React.useState(1);
  const previousKey = React.useRef(resetKey);

  if (previousKey.current !== resetKey) {
    previousKey.current = resetKey;
    // Render-phase reset: applying it here (rather than in an effect) avoids the
    // extra render that would briefly request a now-invalid page.
    if (page !== 1) setPage(1);
  }

  return [page, setPage];
}
