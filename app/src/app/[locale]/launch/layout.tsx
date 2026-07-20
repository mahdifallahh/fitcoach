import { QueryProvider } from '@/components/providers/query-provider';

/**
 * The installed-PWA entry screen (`/launch`) reads the session via `useMe()`
 * (react-query) to bounce the user to their role home. It sits outside the
 * coach/student/admin segments, so it mounts `QueryProvider` on its own rather
 * than pulling react-query back into the global tree. Its `launch` i18n
 * namespace is already in the global public subset, so no extra intl provider
 * is needed here.
 */
export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
