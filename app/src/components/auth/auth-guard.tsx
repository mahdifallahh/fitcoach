'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useMe } from '@/lib/query/use-auth';
import { useRouter, usePathname } from '@/i18n/routing';
import type { Role } from '@/lib/api/types';

/** Client-side route guard: ensures an authenticated user of the required role. */
export function AuthGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isLoading) return;
    if (isError || !data) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?role=${role.toLowerCase()}&next=${next}`);
    } else if (data.role !== role) {
      router.replace(data.role === 'COACH' ? '/coach' : '/student');
    }
  }, [isLoading, isError, data, role, router, pathname]);

  if (isLoading || isError || !data || data.role !== role) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
