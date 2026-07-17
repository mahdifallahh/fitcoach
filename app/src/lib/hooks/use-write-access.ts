'use client';

import { useMe } from '@/lib/query/use-auth';

/**
 * Whether the current coach may create/edit (write), mirroring the server-side
 * `requiresSub` guard. Writes need a live subscription — an active plan or an
 * unexpired trial. When it lapses the panel goes read-only: everything stays
 * visible, but write actions are locked (the server also returns 402, this just
 * reflects that in the UI so buttons don't look clickable-then-fail).
 *
 * Non-coach users are unaffected (`canWrite: true`) — the gate is coach-only.
 */
export function useWriteAccess(): { canWrite: boolean; expired: boolean; loading: boolean } {
  const { data, isLoading } = useMe();

  if (!data || data.role !== 'COACH') {
    return { canWrite: true, expired: false, loading: isLoading };
  }

  const sub = data.subscription;
  const active =
    !!sub &&
    (sub.status === 'TRIALING' || sub.status === 'ACTIVE') &&
    new Date(sub.endsAt).getTime() > Date.now();

  return { canWrite: active, expired: !active, loading: isLoading };
}
