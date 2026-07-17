import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import {
  Dumbbell,
  FileText,
  Languages,
  ListChecks,
  Link2,
  PencilLine,
  UserPlus,
  Share2,
  Inbox,
  BellRing,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { SITE_NAME, SITE_URL, languageAlternates, localeUrl } from '@/lib/site';
import { PUBLIC_PLANS, type PlanCode } from '@/lib/plans';
import { CONTACT } from '@/components/shared/public-footer';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/shared/public-header';
import { PublicFooter } from '@/components/shared/public-footer';
import { PwaInstallSection } from '@/components/shared/pwa-install-section';
import { PricingSection } from '@/components/shared/pricing-section';
import { JsonLd } from '@/components/shared/json-ld';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  const title = t('metaTitle');
  const description = t('metaDescription');
  return {
    title,
    description,
    keywords: t('keywords').split(',').map((k) => k.trim()),
    alternates: { canonical: localeUrl(locale, ''), languages: languageAlternates('') },
    // NB: a page-level `openGraph` replaces the layout's whole object, so the
    // shared card image must be restated here (same for the other public pages).
    openGraph: { title, description, url: localeUrl(locale, ''), locale, images: ['/og.png'] },
  };
}

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

  const coachSteps = [
    { icon: PencilLine, title: t('coachSteps.s1Title'), text: t('coachSteps.s1Text') },
    { icon: Dumbbell, title: t('coachSteps.s2Title'), text: t('coachSteps.s2Text') },
    { icon: Link2, title: t('coachSteps.s3Title'), text: t('coachSteps.s3Text') },
  ];
  const studentSteps = [
    { icon: Share2, title: t('studentSteps.s1Title'), text: t('studentSteps.s1Text') },
    { icon: Inbox, title: t('studentSteps.s2Title'), text: t('studentSteps.s2Text') },
    { icon: BellRing, title: t('studentSteps.s3Title'), text: t('studentSteps.s3Text') },
  ];
  const faqs = [1, 2, 3, 4].map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) }));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      sameAs: [CONTACT.instagram, CONTACT.telegram, CONTACT.bale],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: CONTACT.phoneHref.replace('tel:', ''),
        email: CONTACT.email,
        contactType: 'customer support',
        availableLanguage: ['fa', 'en'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: localeUrl(locale, ''),
      inLanguage: locale,
    },
    // Product + public pricing — powers rich results and gives AI answer engines
    // an unambiguous, machine-readable summary of what fitlo is and costs.
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: localeUrl(locale, ''),
      description: t('metaDescription'),
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: ['fa', 'en'],
      keywords: t('keywords'),
      image: `${SITE_URL}/og.png`,
      offers: (Object.keys(PUBLIC_PLANS) as PlanCode[]).map((code) => ({
        '@type': 'Offer',
        name: `${PUBLIC_PLANS[code].months}-month coach subscription`,
        price: PUBLIC_PLANS[code].priceIrr,
        priceCurrency: 'IRR',
        category: 'subscription',
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={jsonLd} />
      <PublicHeader />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="container flex flex-col items-center gap-8 py-16 text-center sm:py-24">
          <div className="space-y-4">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h1>
            <p className="mx-auto max-w-xl text-pretty text-muted-foreground sm:text-lg">
              {t.rich('subtitleRich', {
                b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
              })}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login?role=coach">
                  <PencilLine className="size-4" /> {t('coachCta')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login?role=student">
                  <UserPlus className="size-4" /> {t('studentCta')}
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('ctaHint')}</p>
          </div>

          <ul className="grid w-full max-w-2xl grid-cols-1 gap-3 text-start sm:grid-cols-2">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30 py-16">
          <div className="container">
            <h2 className="mb-2 text-center text-2xl font-bold">{t('howTitle')}</h2>
            <p className="mx-auto mb-10 max-w-lg text-center text-muted-foreground">{t('howSubtitle')}</p>
            <div className="grid gap-8 md:grid-cols-2">
              <RoleColumn title={t('coachSteps.heading')} steps={coachSteps} />
              <RoleColumn title={t('studentSteps.heading')} steps={studentSteps} />
            </div>
          </div>
        </section>

        <PricingSection />

        <PwaInstallSection />

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 py-16">
          <div className="container max-w-2xl">
            <h2 className="mb-8 text-center text-2xl font-bold">{t('faq.heading')}</h2>
            <div className="divide-y rounded-xl border">
              {faqs.map((f) => (
                <details key={f.q} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none font-medium marker:content-none">
                    <span className="flex items-center justify-between gap-2">
                      {f.q}
                      <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t bg-primary/5 py-14">
          <div className="container flex flex-col items-center gap-4 text-center">
            <h2 className="text-2xl font-bold">{t('ctaTitle')}</h2>
            <Button asChild size="lg">
              <Link href="/login?role=coach">{t('coachCta')}</Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function RoleColumn({
  title,
  steps,
}: {
  title: string;
  steps: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="mb-5 text-lg font-bold">{title}</h3>
      <ol className="space-y-5">
        {steps.map(({ icon: Icon, title: st, text }, i) => (
          <li key={st} className="flex gap-4">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" />
              <span className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{st}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Pre-render both locales at build time.
export function generateStaticParams(): { locale: Locale }[] {
  return (['fa', 'en'] as Locale[]).map((locale) => ({ locale }));
}
