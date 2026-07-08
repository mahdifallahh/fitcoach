import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import type { Role } from '@/lib/api/types';
import { AuthForm } from '@/components/auth/auth-form';
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
  const tc = await getTranslations('common');

  const role: Role = roleParam === 'coach' ? 'COACH' : 'STUDENT';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          {tc('appName')}
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="container flex flex-1 items-center justify-center py-10">
        <AuthForm role={role} next={next} />
      </main>
    </div>
  );
}
