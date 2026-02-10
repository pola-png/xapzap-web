/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: 'https://xapzap-media.s3.wasabisys.com/public/:path*',
      },
    ]
  },
}

export default nextConfig
