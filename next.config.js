/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    domains: ['xapzapolami.b-cdn.net', 'storage.bunnycdn.com'],
    unoptimized: true
  },
}

module.exports = nextConfig