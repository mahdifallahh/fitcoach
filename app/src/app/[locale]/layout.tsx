import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Inter, Vazirmatn } from 'next/font/google';
import { getMessages, getTimeZone, setRequestLocale } from 'next-intl/server';
import { routing, localeDirection, type Locale } from '@/i18n/routing';
import { PUBLIC_CLIENT_NAMESPACES, pickMessages } from '@/i18n/client-messages';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { AppProviders } from '@/components/providers/app-providers';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import '../globals.css';

// `latin` is preloaded alongside `arabic`: fa pages always contain Latin glyphs
// (digits, "fitlo", URLs), and without the subset those characters waited for
// late CSS-discovered fetches — a visible reflow mid-render. Tahoma leads the
// fallback stack because it's the metrically-closest Arabic-capable system font.
//
// `display: 'optional'` (not 'swap'): measured on Lighthouse mobile (Moto G,
// Slow 4G), the web font arrives ~1.6s after first paint, and next/font's
// auto-generated "Vazirmatn Fallback" renders the body ~24–32px shorter than
// the real face — so the mid-render swap dropped everything below the hero,
// costing 0.111 CLS and pushing LCP to 2.5s (the large hero H1 repainting when
// the font landed). `optional` gives the font a ~100ms window, then commits to
// the fallback for the rest of that pageview: no mid-render swap → CLS ~0 and
// the text-LCP paints at FCP (~0.9s). The font still preloads + caches, so it
// shows on fast connections and every repeat visit; only a cold, throttled
// first load renders in the fallback.
const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazir',
  display: 'optional',
  fallback: ['Tahoma', 'Arial', 'sans-serif'],
});
// Inter is only the en-locale face (Vazirmatn covers Latin on fa pages), so don't
// spend the default locale's critical path preloading it; `swap` hides the cost on /en.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: 'fitlo — Coaching & Training Programs', template: '%s · fitlo' },
  description: 'Bilingual fitness coaching & training program platform',
  manifest: '/manifest.webmanifest',
  icons: {
    // Google shows the site icon from a crawlable favicon; a root .ico (multiple
    // of 48px) is the most reliable. The PNG is offered for high-DPI/browser use.
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/icons/icon-192.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    // Regenerate with `node scripts/generate-og.mjs` (inside the container) on rebrand.
    images: [{ url: '/og.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  // `summary_large_image` needs an explicit image — X/Twitter don't reliably
  // fall back to the OG image, so a card without this renders text-only.
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  appleWebApp: { capable: true, title: 'fitlo', statusBarStyle: 'default' },
  // Google Search Console ownership proof — set the env in production to enable.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);
  // Public pages only get the client namespaces they actually render with; the
  // app segments re-provide the full catalog (see i18n/client-messages.ts).
  const messages = pickMessages(await getMessages(), PUBLIC_CLIENT_NAMESPACES);
  const timeZone = await getTimeZone();
  const dir = localeDirection[locale as Locale];
  const fontVar = locale === 'fa' ? 'var(--font-vazir)' : 'var(--font-inter)';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${inter.variable}`}
      style={{ '--font-app': fontVar } as React.CSSProperties}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AppProviders locale={locale} messages={messages} timeZone={timeZone}>
          {children}
          <InstallPrompt />
        </AppProviders>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
