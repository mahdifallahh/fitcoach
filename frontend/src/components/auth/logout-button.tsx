'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useLogout } from '@/lib/query/use-auth';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const logout = useLogout();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      disabled={logout.isPending}
      onClick={() => logout.mutate(undefined, { onSuccess: () => router.replace('/') })}
    >
      <LogOut className="size-4 rtl-flip" />
      <span>{t('logout')}</span>
    </Button>
  );
}
