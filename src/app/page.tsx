import Script from 'next/script'
import Link from 'next/link'

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "BooksFlowAI",
        "description": "AI-powered accounting intelligence platform that automates QuickBooks cleanup, OCR receipt processing, and client reporting for solo CPAs",
        "url": "https://booksflowai.com",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "199",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "127",
          "bestRating": "5",
          "worstRating": "1"
        },
        "featureList": [
          "AI Transaction Categorization",
          "OCR Receipt Processing",
          "Automated Client Reports",
          "QuickBooks Integration",
          "95% Accuracy Rate"
        ]
      },
      {
        "@type": "Organization",
        "name": "BooksFlowAI",
        "url": "https://booksflowai.com",
        "logo": "https://booksflowai.com/images/logo.png",
        "description": "Leading AI-powered accounting intelligence platform for solo CPAs and small accounting firms",
        "foundingDate": "2024",
        "industry": "Accounting Software",
        "numberOfEmployees": "11-50",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "US"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How accurate is BooksFlowAI's transaction categorization?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "BooksFlowAI achieves 95% accuracy in transaction categorization using advanced AI algorithms trained specifically for accounting workflows."
            }
          },
          {
            "@type": "Question",
            "name": "Does BooksFlowAI integrate with QuickBooks?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, BooksFlowAI seamlessly integrates with QuickBooks Online and Desktop versions, allowing automatic sync and categorization of transactions."
            }
          },
          {
            "@type": "Question",
            "name": "How much time can I save with BooksFlowAI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Solo CPAs typically save 10+ hours per week by automating transaction categorization, receipt processing, and client report generation."
            }
          }
        ]
      }
    ]
  }

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <span className="inline-block bg-primary-100 text-primary-800 text-sm font-medium px-3 py-1 rounded-full mb-4">
                🚀 AI-Powered Accounting Intelligence
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Finally! Accounting That Doesn't Require
              <span className="text-primary-600 block">20 Hours of Manual Data Entry</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Revolutionary AI accounting platform that automates QuickBooks cleanup, OCR receipt processing, 
              and client reporting. <strong>Solo CPAs save 10+ hours weekly</strong> with 95% accurate transaction categorization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/auth" className="bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg text-center">
                Start Free 14-Day Trial
              </Link>
              <Link href="/demo" className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-50 transition-colors text-center">
                Watch 3-Minute Demo
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              ✅ No credit card required • ✅ Setup in under 5 minutes • ✅ Cancel anytime
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Stop Drowning in Manual Bookkeeping Tasks
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Transform your accounting practice with AI that handles the tedious work, 
                so you can focus on high-value advisory services.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="text-center p-8 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary-100 rounded-xl mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">AI Transaction Cleanup</h3>
                <p className="text-gray-600 mb-4">Automatically categorize QuickBooks transactions with 95% accuracy using advanced machine learning algorithms trained on millions of accounting entries.</p>
                <div className="text-sm text-primary-600 font-medium">
                  ⚡ Saves 6+ hours weekly
                </div>
              </div>
              <div className="text-center p-8 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-success-100 rounded-xl mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">OCR Receipt Processing</h3>
                <p className="text-gray-600 mb-4">Clients upload receipts through secure portal. AI extracts vendor, amount, date, and automatically matches to existing transactions.</p>
                <div className="text-sm text-success-600 font-medium">
                  ⚡ Saves 3+ hours weekly
                </div>
              </div>
              <div className="text-center p-8 border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-info-100 rounded-xl mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-8 h-8 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Smart Client Reports</h3>
                <p className="text-gray-600 mb-4">Generate plain-English financial summaries and insights that clients actually understand. Automated monthly reports with actionable recommendations.</p>
                <div className="text-sm text-info-600 font-medium">
                  ⚡ Saves 2+ hours weekly
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Trusted by 500+ Solo CPAs and Small Firms
              </h2>
              <div className="flex justify-center items-center space-x-8 text-gray-600">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">95%</div>
                  <div className="text-sm">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">10+</div>
                  <div className="text-sm">Hours Saved Weekly</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">500+</div>
                  <div className="text-sm">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">4.8★</div>
                  <div className="text-sm">User Rating</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600">
                Everything you need to know about BooksFlowAI
              </p>
            </div>
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  How accurate is BooksFlowAI's transaction categorization?
                </h3>
                <p className="text-gray-600">
                  BooksFlowAI achieves 95% accuracy in transaction categorization using advanced AI algorithms 
                  trained specifically for accounting workflows. Our system learns from millions of properly 
                  categorized transactions and continuously improves its accuracy.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Does BooksFlowAI integrate with QuickBooks?
                </h3>
                <p className="text-gray-600">
                  Yes, BooksFlowAI seamlessly integrates with both QuickBooks Online and Desktop versions. 
                  Our secure OAuth connection allows automatic sync and categorization of transactions without 
                  compromising your data security.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  How much time can I save with BooksFlowAI?
                </h3>
                <p className="text-gray-600">
                  Solo CPAs typically save 10+ hours per week by automating transaction categorization, 
                  receipt processing, and client report generation. This time can be redirected to 
                  high-value advisory services that increase revenue.
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Is my client data secure with BooksFlowAI?
                </h3>
                <p className="text-gray-600">
                  Absolutely. We use bank-level encryption, SOC 2 compliance, and never store sensitive 
                  financial data permanently. All data processing happens in secure, encrypted environments 
                  with full audit trails.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-600 py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Reclaim Your Time?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Join 500+ CPAs who've already automated their bookkeeping workflows. 
              Start your free trial today and see the difference AI can make.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth" className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg text-center">
                Start Free 14-Day Trial
              </Link>
              <Link href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors text-center">
                Schedule Demo Call
              </Link>
            </div>
            <p className="text-sm text-primary-200 mt-4">
              ✅ No credit card required • ✅ Full feature access • ✅ Cancel anytime
            </p>
          </div>
        </section>
      </main>
    </>
  )
}