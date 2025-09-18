import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CriticalErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'

// Optimize font loading
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'BooksFlowAI - AI-Powered Accounting Intelligence Platform | Save 10+ Hours/Week',
  description: 'Revolutionary AI accounting platform that automates QuickBooks cleanup, OCR receipt processing, and client reporting. Solo CPAs save 10+ hours weekly with 95% accurate transaction categorization.',
  keywords: 'AI accounting software, QuickBooks automation, CPA AI tools, automated bookkeeping, OCR receipt processing, AI transaction categorization, accounting intelligence platform, solo CPA software, QuickBooks AI cleanup, automated client reports',
  authors: [{ name: 'BooksFlowAI Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    title: 'BooksFlowAI - AI-Powered Accounting Intelligence Platform',
    description: 'Revolutionary AI accounting platform that automates QuickBooks cleanup, OCR receipt processing, and client reporting. Solo CPAs save 10+ hours weekly.',
    url: 'https://booksflowai.com',
    siteName: 'BooksFlowAI',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'BooksFlowAI - AI-Powered Accounting Intelligence Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BooksFlowAI - AI-Powered Accounting Intelligence Platform',
    description: 'Revolutionary AI accounting platform that automates QuickBooks cleanup, OCR receipt processing, and client reporting.',
    images: ['/images/twitter-card.jpg'],
    creator: '@BooksFlowAI',
  },
  alternates: {
    canonical: 'https://booksflowai.com',
  },
  other: {
    'msapplication-TileColor': '#2563eb',
    'theme-color': '#2563eb',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialize global error handlers
  if (typeof window === 'undefined') {
    // Server-side error handling
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection in Root Layout', reason as Error, {
        type: 'unhandled_rejection',
        location: 'root_layout'
      })
    })
  }

  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Critical CSS for above-the-fold content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS for immediate rendering */
            .hero-gradient {
              background: linear-gradient(to bottom, rgb(239 246 255), rgb(255 255 255));
            }
            .primary-btn {
              background-color: rgb(37 99 235);
              color: white;
              transition: background-color 0.2s;
            }
            .primary-btn:hover {
              background-color: rgb(29 78 216);
            }
            /* Prevent layout shift */
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 0 1rem;
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <CriticalErrorBoundary>
          {children}
        </CriticalErrorBoundary>
        
        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Core Web Vitals monitoring
              if ('web-vital' in window) {
                new PerformanceObserver((entryList) => {
                  for (const entry of entryList.getEntries()) {
                    console.log('Web Vital:', entry.name, entry.value);
                  }
                }).observe({entryTypes: ['measure']});
              }
            `
          }}
        />
      </body>
    </html>
  )
}