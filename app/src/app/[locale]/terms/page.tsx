import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { languageAlternates, localeUrl } from '@/lib/site';
import { getLegalDoc } from '@/lib/legal';
import { LegalArticle } from '@/components/shared/legal-article';

export function generateStaticParams(): { locale: Locale }[] {
  return (['fa', 'en'] as Locale[]).map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = getLegalDoc('terms').content[locale as Locale];
  return {
    title: c.title,
    description: c.intro,
    alternates: { canonical: localeUrl(locale, '/terms'), languages: languageAlternates('/terms') },
    openGraph: { title: c.title, description: c.intro, url: localeUrl(locale, '/terms'), locale, images: ['/og.png'] },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalArticle slug="terms" locale={locale} />;
}
