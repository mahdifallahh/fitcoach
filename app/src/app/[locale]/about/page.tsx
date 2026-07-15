import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { languageAlternates, localeUrl } from '@/lib/site';
import { PublicHeader } from '@/components/shared/public-header';
import { PublicFooter } from '@/components/shared/public-footer';
import { Button } from '@/components/ui/button';

export function generateStaticParams(): { locale: Locale }[] {
  return (['fa', 'en'] as Locale[]).map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  const title = t('title');
  const description = t('intro');
  return {
    title,
    description,
    alternates: { canonical: localeUrl(locale, '/about'), languages: languageAlternates('/about') },
    openGraph: { title, description, url: localeUrl(locale, '/about'), locale, images: ['/og.png'] },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const values = [1, 2, 3, 4].map((n) => t(`value${n}`));

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="container max-w-2xl flex-1 py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('intro')}</p>

        <h2 className="mt-10 text-xl font-bold">{t('missionHeading')}</h2>
        <p className="mt-3 text-muted-foreground">{t('mission')}</p>

        <h2 className="mt-10 text-xl font-bold">{t('valuesHeading')}</h2>
        <ul className="mt-4 space-y-3">
          {values.map((v) => (
            <li key={v} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="text-muted-foreground">{v}</span>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border bg-primary/5 p-6 text-center">
          <p className="text-lg font-bold">{t('ctaTitle')}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/login?role=coach">{t('ctaCoach')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login?role=student">{t('ctaStudent')}</Link>
            </Button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
