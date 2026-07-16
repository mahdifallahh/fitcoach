import { getTranslations, getFormatter } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getLegalDoc, type LegalBlock, type LegalSlug } from '@/lib/legal';
import { PublicHeader } from '@/components/shared/public-header';
import { PublicFooter } from '@/components/shared/public-footer';

/** Renders a Terms/Privacy document (shared by /terms and /privacy). */
export async function LegalArticle({ slug, locale }: { slug: LegalSlug; locale: string }) {
  const doc = getLegalDoc(slug);
  const c = doc.content[locale as Locale];
  const t = await getTranslations('legal');
  const format = await getFormatter();

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="container max-w-2xl flex-1 py-14">
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">{c.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{c.intro}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('lastUpdated', {
                date: format.dateTime(new Date(doc.updated), { dateStyle: 'long' }),
              })}
            </p>
          </header>

          <div className="text-[15px] leading-7">
            {c.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
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
