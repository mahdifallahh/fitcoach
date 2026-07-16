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
  const c = getLegalDoc('privacy').content[locale as Locale];
  return {
    title: c.title,
    description: c.intro,
    alternates: { canonical: localeUrl(locale, '/privacy'), languages: languageAlternates('/privacy') },
    openGraph: { title: c.title, description: c.intro, url: localeUrl(locale, '/privacy'), locale, images: ['/og.png'] },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalArticle slug="privacy" locale={locale} />;
}
