import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Dumbbell, FileText, Languages, ListChecks } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const tc = await getTranslations('common');

  const features = [
    { icon: ListChecks, text: t('features.programs') },
    { icon: Dumbbell, text: t('features.library') },
    { icon: FileText, text: t('features.pdf') },
    { icon: Languages, text: t('features.bilingual') },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-lg font-bold text-primary">{tc('appName')}</span>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center justify-center gap-10 py-16 text-center">
        <div className="space-y-4">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login?role=coach">{t('coachCta')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login?role=student">{t('studentCta')}</Link>
          </Button>
        </div>

        <ul className="grid w-full max-w-2xl grid-cols-1 gap-3 text-start sm:grid-cols-2">
          {features.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
