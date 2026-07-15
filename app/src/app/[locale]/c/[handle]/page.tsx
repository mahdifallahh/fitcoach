import { cache } from 'react';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ExternalLink, Phone, Send } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { languageAlternates, localeUrl } from '@/lib/site';
import { getPublicCoach } from '@/server/container';
import { PublicHeader } from '@/components/shared/public-header';
import { JsonLd } from '@/components/shared/json-ld';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // per-request DB lookup

type PublicCoach = Awaited<ReturnType<ReturnType<typeof getPublicCoach>['getByHandle']>>;

/** Deduped per-request so generateMetadata + the page share one DB call. */
const loadCoach = cache(async (handle: string): Promise<PublicCoach | null> => {
  try {
    return await getPublicCoach().getByHandle(handle);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
  const { locale, handle } = await params;
  const coach = await loadCoach(handle);
  const t = await getTranslations({ locale, namespace: 'publicCoach' });
  if (!coach) {
    return { title: t('notFound'), robots: { index: false, follow: false } };
  }
  const title = t('metaTitle', { name: coach.name });
  const description = coach.bio ?? t('metaDescription', { name: coach.name });
  const path = `/c/${handle}`;
  return {
    title,
    description,
    alternates: { canonical: localeUrl(locale, path), languages: languageAlternates(path) },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: localeUrl(locale, path),
      locale,
      images: coach.avatarUrl ? [{ url: coach.avatarUrl }] : ['/og.png'],
    },
  };
}

export default async function PublicCoachPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const coach = await loadCoach(handle);
  const t = await getTranslations('publicCoach');

  const socialLinks = (coach?.socialLinks ?? []) as { type: string; label?: string; url: string }[];

  const jsonLd = coach
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: coach.name,
          description: coach.bio ?? undefined,
          image: coach.avatarUrl ?? undefined,
          url: localeUrl(locale, `/c/${handle}`),
          jobTitle: 'Fitness Coach',
        },
      }
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      {jsonLd && <JsonLd data={jsonLd} />}
      <PublicHeader />

      <main className="container flex flex-1 justify-center py-10">
        <div className="w-full max-w-md">
          {!coach ? (
            <p className="py-16 text-center text-muted-foreground">{t('notFound')}</p>
          ) : (
            <div className="flex flex-col items-center text-center">
              {coach.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coach.avatarUrl}
                  alt={coach.name}
                  className="size-24 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                  {coach.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="mt-4 text-2xl font-bold">{coach.name}</h1>
              {coach.bio && <p className="mt-2 text-muted-foreground">{coach.bio}</p>}

              {coach.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {coach.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Button asChild size="lg" className="mt-6 w-full">
                <Link href={`/c/${handle}/request`}>
                  <Send className="size-4 rtl-flip" />
                  {t('requestProgram')}
                </Link>
              </Button>

              <div className="mt-6 w-full space-y-2">
                {coach.phone && (
                  <a
                    href={`tel:${coach.phone}`}
                    dir="ltr"
                    className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    <Phone className="size-4" /> {coach.phone}
                  </a>
                )}
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    <ExternalLink className="size-4" /> {link.label || link.type}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
