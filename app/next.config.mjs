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
  // Lint in dev and CI (`pnpm lint`), not in the deploy build: eslint and
  // eslint-config-next are devDependencies, so on a host that installs
  // production deps only their absence would fail an otherwise valid build.
  // Type errors still fail the build — `next build` remains the typecheck step.
  eslint: { ignoreDuringBuilds: true },
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
  // The ffmpeg/ffprobe installers derive their binary path from their own
  // location on disk, so bundling them would hand back a path that doesn't exist.
  serverExternalPackages: [
    '@prisma/client',
    'puppeteer-core',
    '@ffmpeg-installer/ffmpeg',
    '@ffprobe-installer/ffprobe',
  ],
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
        // Security headers, on every response. None of these were set before, so
        // the browser was falling back to its most permissive defaults.
        source: '/:path*',
        headers: [
          // Stop content-type sniffing — an uploaded file that a browser decides
          // is HTML would run as HTML on our origin.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // The panels show a student's data; keep it out of other sites' frames.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Send the origin, never the full path: program URLs carry ids we do
          // not want handed to a coach's linked Instagram or an embedded video.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Nothing here uses these, and silence is the safest default.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Two years, subdomains included, preload-eligible. Only ever sent over
          // HTTPS, so this is inert on a local http:// run.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
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
