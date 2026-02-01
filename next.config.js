/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['xapzapolami.b-cdn.net', 'storage.bunnycdn.com'],
  },
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig