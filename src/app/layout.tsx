import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CriticalErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Solo Accountant AI',
  description: 'AI-powered QuickBooks automation and client reporting for solo CPAs',
  keywords: 'accounting, AI, QuickBooks, CPA, bookkeeping, automation, receipts, reports',
  authors: [{ name: 'Solo Accountant AI Team' }],
  viewport: 'width=device-width, initial-scale=1',
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
      <body className={inter.className}>
        <CriticalErrorBoundary>
          {children}
        </CriticalErrorBoundary>
      </body>
    </html>
  )
}