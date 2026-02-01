/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    domains: ['xapzapolami.b-cdn.net', 'storage.bunnycdn.com'],
    unoptimized: true
  },
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    NEXT_PUBLIC_BUNNY_CDN_BASE_URL: process.env.NEXT_PUBLIC_BUNNY_CDN_BASE_URL,
  }
}

module.exports = nextConfig