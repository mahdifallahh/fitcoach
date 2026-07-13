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
  },
  // Keep native/server-only packages out of the bundle so their runtime engines
  // (Prisma query engine, Chromium launcher) load from node_modules at runtime.
  serverExternalPackages: ['@prisma/client', 'puppeteer-core'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default withNextIntl(nextConfig);
