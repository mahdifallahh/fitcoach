import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations, getFormatter } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { getAllPostSlugs, getPost, type BlogBlock } from '@/lib/blog';
import { SITE_NAME, SITE_URL, languageAlternates, localeUrl } from '@/lib/site';
import { PublicHeader } from '@/components/shared/public-header';
import { PublicFooter } from '@/components/shared/public-footer';
import { JsonLd } from '@/components/shared/json-ld';
import { Button } from '@/components/ui/button';

export function generateStaticParams(): { locale: Locale; slug: string }[] {
  const slugs = getAllPostSlugs();
  return (['fa', 'en'] as Locale[]).flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const c = post.content[locale as Locale];
  const path = `/blog/${slug}`;
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: localeUrl(locale, path), languages: languageAlternates(path) },
    openGraph: {
      type: 'article',
      title: c.title,
      description: c.description,
      url: localeUrl(locale, path),
      locale,
      publishedTime: post.date,
      images: ['/og.png'],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPost(slug);
  if (!post) notFound();

  const t = await getTranslations('blog');
  const format = await getFormatter();
  const c = post.content[locale as Locale];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: c.title,
      description: c.description,
      datePublished: post.date,
      inLanguage: locale,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
      },
      mainEntityOfPage: localeUrl(locale, `/blog/${slug}`),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: localeUrl(locale, '') },
        { '@type': 'ListItem', position: 2, name: t('indexTitle'), item: localeUrl(locale, '/blog') },
        { '@type': 'ListItem', position: 3, name: c.title, item: localeUrl(locale, `/blog/${slug}`) },
      ],
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={jsonLd} />
      <PublicHeader />
      <main className="container max-w-2xl flex-1 py-12">
        <Link
          href="/blog"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 rtl-flip" /> {t('backToBlog')}
        </Link>

        <article>
          <header className="mb-8">
            <p className="text-sm text-muted-foreground">
              {format.dateTime(new Date(post.date), { dateStyle: 'long' })} ·{' '}
              {t('minRead', { min: post.readingMinutes })}
            </p>
            <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight">{c.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{c.description}</p>
          </header>

          <div className="text-[15px] leading-7">
            {c.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>

        {/* Conversion CTA */}
        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border bg-primary/5 p-6 text-center">
          <p className="text-lg font-bold">{t('ctaTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('ctaText')}</p>
          <Button asChild size="lg">
            <Link href="/login?role=coach">{t('ctaButton')}</Link>
          </Button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function Block({ block }: { block: BlogBlock }) {
  if (block.type === 'h2') return <h2 className="mt-8 text-xl font-bold">{block.text}</h2>;
  if (block.type === 'ul') {
    return (
      <ul className="mt-4 list-disc space-y-1.5 ps-6 text-muted-foreground">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="mt-4 text-muted-foreground">{block.text}</p>;
}
