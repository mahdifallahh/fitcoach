import type { Metadata } from 'next';
import { setRequestLocale, getTranslations, getFormatter } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { listPosts } from '@/lib/blog';
import { languageAlternates, localeUrl } from '@/lib/site';
import { PublicHeader } from '@/components/shared/public-header';
import { PublicFooter } from '@/components/shared/public-footer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const title = t('indexTitle');
  const description = t('indexSubtitle');
  return {
    title,
    description,
    alternates: { canonical: localeUrl(locale, '/blog'), languages: languageAlternates('/blog') },
    openGraph: { title, description, url: localeUrl(locale, '/blog'), locale, images: ['/og.png'] },
  };
}

export function generateStaticParams(): { locale: Locale }[] {
  return (['fa', 'en'] as Locale[]).map((locale) => ({ locale }));
}

export default async function BlogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('blog');
  const format = await getFormatter();
  const posts = listPosts(locale as Locale);

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="container max-w-3xl flex-1 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight">{t('indexTitle')}</h1>
          <p className="mt-2 text-muted-foreground">{t('indexSubtitle')}</p>
        </header>

        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
              >
                <p className="text-xs text-muted-foreground">
                  {format.dateTime(new Date(post.date), { dateStyle: 'medium' })} ·{' '}
                  {t('minRead', { min: post.readingMinutes })}
                </p>
                <h2 className="mt-1 text-lg font-bold">{post.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t('readMore')} <ArrowRight className="size-4 rtl-flip" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </div>
  );
}
