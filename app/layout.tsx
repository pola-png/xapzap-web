import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'XapZap - Social Media Platform',
    template: '%s | XapZap'
  },
  description: 'Connect, share videos, news, reels and discover content with XapZap - the ultimate social media platform for posts, stories, chats and more.',
  keywords: 'social media, videos, news, reels, posts, stories, chat, xapzap, social network, share content',
  authors: [{ name: 'XapZap Team' }],
  creator: 'XapZap',
  publisher: 'XapZap',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'XapZap - Social Media Platform',
    description: 'Connect, share and discover with XapZap',
    url: 'https://xapzap.com',
    siteName: 'XapZap',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'XapZap',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XapZap - Social Media Platform',
    description: 'Connect, share and discover with XapZap',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) { 
                document.documentElement.classList.add('dark')
              } else { 
                document.documentElement.classList.remove('dark')
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}
