import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is needed for the slim Docker (Linux) prod image. It uses
  // symlinks during trace collection, which fail on Windows without elevated
  // privileges — so enable it only when explicitly requested (set in Dockerfile).
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  // Tree-shake per-icon/component imports from big barrel packages → smaller bundles.
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Ship the compiled Tailwind CSS as an inline <style> instead of a
    // render-blocking <link>. The whole sheet is ~8 KB gzipped while the
    // request for it was the entire LCP critical path in production
    // (~2s of chain latency on Lighthouse mobile — the origin has no CDN).
    // NB: this is Next's native App-Router inliner — NOT `optimizeCss`
    // (critters), which was tried and reverted because it breaks app-router
    // prerendering (`<Html> should not be imported…` on /404).
    inlineCss: true,
  },
  // Keep native/server-only packages out of the bundle so their runtime engines
  // (Prisma query engine, Chromium launcher) load from node_modules at runtime.
  serverExternalPackages: ['@prisma/client', 'puppeteer-core'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Optimized remote images (avatars/GIF posters) can be re-served from the
    // image cache for a day instead of the 60s default.
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Cache policy for public/ assets (Next only auto-immutables /_next/static).
  async headers() {
    return [
      {
        // App icons are referenced by fixed paths from the manifest/metadata and
        // effectively never change without a rebrand.
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Social scrapers refetch OG images on their own schedule; a day is plenty.
        source: '/og.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        // The service worker must revalidate on every load so app updates roll
        // out promptly (a long-cached sw.js pins users to a stale app shell).
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
