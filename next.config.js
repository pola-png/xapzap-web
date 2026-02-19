/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    turbo: {
      resolveAlias: {
        canvas: './empty-module.ts',
      },
    },
  },
  images: {
    unoptimized: true,
  },
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
    responseLimit: false,
  },
}

module.exports = nextConfig
