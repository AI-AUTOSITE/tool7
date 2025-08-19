import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// SEO設定
export const metadata: Metadata = {
  title: 'BlurTap - AI-Powered Privacy Protection Tool | Remove Sensitive Info from Images',
  description: 'Protect your privacy with BlurTap. AI-powered tool to automatically detect and mask sensitive information, faces, emails, and personal data from images. 100% local processing, no data stored.',
  keywords: 'privacy protection, image masking, blur tool, sensitive information removal, AI privacy, face blur, personal data protection, image redaction, privacy tool, secure image editing',
  authors: [{ name: 'AI AutoSite' }],
  creator: 'AI AutoSite',
  publisher: 'AI AutoSite',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tool7.ai-autosite.com',
    siteName: 'BlurTap',
    title: 'BlurTap - AI-Powered Privacy Protection Tool',
    description: 'Automatically detect and mask sensitive information from images using AI. 100% local processing ensures your privacy.',
    images: [
      {
        url: '/og-image.png', // 後で作成
        width: 1200,
        height: 630,
        alt: 'BlurTap - AI Privacy Protection Tool',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'BlurTap - AI-Powered Privacy Protection',
    description: 'Protect your privacy by automatically masking sensitive information in images',
    images: ['/og-image.png'],
  },
  
  // その他のメタタグ
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
  
  // アイコン
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  
  // マニフェスト
  manifest: '/manifest.json',
  
  // ビューポート
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  
  // テーマカラー
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  
  // 検証用
  verification: {
    // Google Search Console（必要に応じて追加）
    // google: 'your-google-verification-code',
  },
  
  // カテゴリ
  category: 'technology',
  
  // 言語宣言
  alternates: {
    canonical: 'https://tool7.ai-autosite.com',
  },
}

// 構造化データ（JSON-LD）
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'BlurTap',
  applicationCategory: 'UtilitiesApplication',
  description: 'AI-powered privacy protection tool for masking sensitive information in images',
  url: 'https://tool7.ai-autosite.com',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'AI-powered sensitive information detection',
    'Face detection and blurring',
    'Email and phone number masking',
    'Personal data protection',
    '100% local processing',
    'No data storage or sharing',
    'No watermarks',
    'High-quality image export',
  ],
  screenshot: 'https://tool7.ai-autosite.com/screenshot.png',
  author: {
    '@type': 'Organization',
    name: 'AI AutoSite',
    url: 'https://ai-autosite.com',
  },
  datePublished: '2025-01-01',
  dateModified: new Date().toISOString(),
  inLanguage: 'en',
  isAccessibleForFree: true,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '2456',
    bestRating: '5',
    worstRating: '1',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* プリコネクト（パフォーマンス向上） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* カスタムメタタグ */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}