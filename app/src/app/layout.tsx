/**
 * Passthrough root layout. The real document (<html>/<body>, fonts, providers)
 * lives in [locale]/layout.tsx; this exists so the root not-found.tsx below can
 * render for non-localized paths. Without these two files, Next 15.5 prerenders
 * the global /404 through the pages-router _error fallback and the production
 * build dies with "<Html> should not be imported outside of pages/_document".
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
