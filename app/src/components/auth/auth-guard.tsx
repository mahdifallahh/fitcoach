'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useMe } from '@/lib/query/use-auth';
import { useRouter, usePathname } from '@/i18n/routing';
import { ApiError } from '@/lib/api/client';
import { defaultHome, hasCapability } from '@/lib/api/auth';
import type { Role } from '@/lib/api/types';

/**
 * Client-side route guard: ensures an authenticated account that may enter this
 * panel. Checked by **capability**, so an account holding both a coach and a
 * student side can open either panel without being bounced.
 */
export function AuthGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const t = useTranslations('auth');
  const { data, isLoading, isError, error } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isLoading) return;
    if (isError || !data) {
      // A real 401 means "not signed in" — redirect quietly. Anything else (network
      // blip, 5xx) looks identical to the user unless we say so before bouncing them.
      if (!(error instanceof ApiError && error.status === 401)) {
        toast.error(t('sessionError'));
      }
      const next = encodeURIComponent(pathname);
      router.replace(`/login?role=${role.toLowerCase()}&next=${next}`);
    } else if (!hasCapability(data, role)) {
      // Signed in, but this side of the account isn't enabled — send them to a
      // panel they can actually use (they can turn the other side on there).
      router.replace(defaultHome(data));
    }
  }, [isLoading, isError, data, error, role, router, pathname, t]);

  if (isLoading || isError || !data || !hasCapability(data, role)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
