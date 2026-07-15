'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCap, Loader2, PencilLine } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { roleHome } from '@/lib/api/auth';
import { useMe } from '@/lib/query/use-auth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';

/**
 * The installed PWA's `start_url` (see public/manifest.webmanifest). A returning,
 * already-authenticated user is bounced straight to their panel; everyone else
 * gets a minimal role picker instead of the full marketing landing page.
 */
export default function LaunchPage() {
  const t = useTranslations('launch');
  const router = useRouter();
  const { data, isLoading } = useMe();

  React.useEffect(() => {
    if (data) router.replace(roleHome(data.role));
  }, [data, router]);

  const showPicker = !isLoading && !data;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end gap-1 px-4 py-3">
        <LocaleSwitcher />
        <ThemeToggle />
      </header>

      <main className="container flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
        <Logo variant="mark" size="lg" />

        {showPicker ? (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button asChild size="lg">
                <Link href="/login?role=coach">
                  <PencilLine className="size-4" />
                  {t('coachCta')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login?role=student">
                  <GraduationCap className="size-4" />
                  {t('studentCta')}
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
      </main>
    </div>
  );
}
