import Link from 'next/link';

/**
 * Global not-found for paths outside the [locale] tree (the middleware localizes
 * almost everything, so this is a rare fallback — and the /404 the production
 * build prerenders). No locale context exists here, so it renders its own
 * minimal bilingual document without translations or app providers.
 */
export default function NotFound() {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          fontFamily: 'Vazirmatn, Tahoma, Arial, sans-serif',
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: '2rem', margin: 0 }}>۴۰۴</h1>
        <p style={{ margin: 0 }}>صفحه‌ای که دنبالش بودی پیدا نشد.</p>
        <p style={{ margin: 0 }} dir="ltr">
          Page not found.
        </p>
        <Link href="/fa" style={{ color: '#2563eb' }}>
          بازگشت به فیتلو
        </Link>
      </body>
    </html>
  );
}
