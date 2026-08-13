/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    }
  },
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://www.google.com/search?q=XapZap",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return []
  },
}

export default nextConfig
