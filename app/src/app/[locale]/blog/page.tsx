import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale, getTranslations, getFormatter } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { listPosts, postHero } from '@/lib/blog';
import { SITE_NAME, SITE_URL, languageAlternates, localeUrl } from '@/lib/site';
import { PublicHeader } from '@/components/shared/public-header';
import { PublicFooter } from '@/components/shared/public-footer';
import { JsonLd } from '@/components/shared/json-ld';

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

  // Blog + ItemList structured data: tells Google this is a blog listing and
  // enumerates its articles (image + url + date), so the posts are eligible for
  // article-rich results instead of being read as a generic page of links.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: t('indexTitle'),
      description: t('indexSubtitle'),
      url: localeUrl(locale, '/blog'),
      inLanguage: locale,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
      },
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        image: `${SITE_URL}${postHero(post.slug)}`,
        url: localeUrl(locale, `/blog/${post.slug}`),
        mainEntityOfPage: localeUrl(locale, `/blog/${post.slug}`),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: localeUrl(locale, '') },
        { '@type': 'ListItem', position: 2, name: t('indexTitle'), item: localeUrl(locale, '/blog') },
      ],
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={jsonLd} />
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
                className="group block overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/50"
              >
                <Image
                  src={postHero(post.slug)}
                  alt={post.title}
                  width={1200}
                  height={630}
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="aspect-[1200/630] w-full border-b object-cover"
                />
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">
                    {format.dateTime(new Date(post.date), { dateStyle: 'medium' })} ·{' '}
                    {t('minRead', { min: post.readingMinutes })}
                  </p>
                  <h2 className="mt-1 text-lg font-bold">{post.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t('readMore')} <ArrowRight className="size-4 rtl-flip" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </div>
  );
}
