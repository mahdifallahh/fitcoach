import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Role } from '@/lib/api/types';
import { AuthForm } from '@/components/auth/auth-form';
import { Logo } from '@/components/shared/logo';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const { locale } = await params;
  const { role: roleParam, next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');

  const role: Role = roleParam === 'coach' ? 'COACH' : 'STUDENT';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" aria-label={tc('logoHome')}>
          <Logo size="md" priority alt={tc('logoHome')} markAlt={tc('logoHomeMark')} />
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="container flex flex-1 flex-col items-center justify-center gap-6 py-10">
        <Logo variant="mark" size="lg" alt={tc('logoBrandMark')} />
        <AuthForm role={role} next={next} />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4 rtl-flip" />
          {t('backHome')}
        </Link>
      </main>
    </div>
  );
}
