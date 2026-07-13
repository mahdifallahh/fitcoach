import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Inter, Vazirmatn } from 'next/font/google';
import { getMessages, getTimeZone, setRequestLocale } from 'next-intl/server';
import { routing, localeDirection, type Locale } from '@/i18n/routing';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { AppProviders } from '@/components/providers/app-providers';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import '../globals.css';

const vazirmatn = Vazirmatn({ subsets: ['arabic'], variable: '--font-vazir', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: 'fitlo — Coaching & Training Programs', template: '%s · fitlo' },
  description: 'Bilingual fitness coaching & training program platform',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: { card: 'summary' },
  appleWebApp: { capable: true, title: 'fitlo', statusBarStyle: 'default' },
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
  const messages = await getMessages();
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
