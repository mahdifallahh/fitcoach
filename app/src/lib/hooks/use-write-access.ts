'use client';

import { useMe } from '@/lib/query/use-auth';

/**
 * Whether the current coach may create/edit (write), mirroring the server-side
 * `requiresSub` guard. Every coach is on at least the permanent FREE tier, whose
 * subscription never expires (`endsAt === null`) → always active. Only a legacy
 * time-based paid plan can lapse (a non-null `endsAt` in the past), which sends
 * the panel read-only. A coach with no row yet is treated as FREE-active.
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
    !sub || // implicit FREE
    ((sub.status === 'TRIALING' || sub.status === 'ACTIVE') &&
      (sub.endsAt === null || new Date(sub.endsAt).getTime() > Date.now()));

  return { canWrite: active, expired: !active, loading: isLoading };
}
