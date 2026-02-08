import withSitemap from 'next-sitemap'

const nextConfig = {
  images: {
    unoptimized: true
  }
}

export default withSitemap({
  siteUrl: process.env.SITE_URL || 'https://xapzap.com',
  generateSitemap: true,
  sitemapSize: 5000,
  changefreq: 'daily',
  priority: 0.7,
  sitemapPath: 'sitemap.xml',
  exclude: ['/admin*', '/private*'],
})(nextConfig)