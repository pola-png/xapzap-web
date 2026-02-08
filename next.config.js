/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  }
}

const { withSitemap } = require('next-sitemap');

module.exports = withSitemap({
  siteUrl: process.env.SITE_URL || 'https://xapzap.com',
  generateSitemap: true,
  sitemapSize: 5000,
  changefreq: 'daily',
  priority: 0.7,
  sitemapPath: 'sitemap.xml',
  exclude: ['/admin*', '/private*'],
})(nextConfig)
