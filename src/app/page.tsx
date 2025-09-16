export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Solo Accountant AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered QuickBooks automation and client reporting for solo CPAs
          </p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Transaction Cleanup</h3>
                <p className="text-gray-600 text-sm">Automatically categorize QuickBooks transactions with 95% accuracy</p>
              </div>
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 bg-success-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">OCR Receipt Processing</h3>
                <p className="text-gray-600 text-sm">Clients upload receipts, AI extracts data and matches transactions</p>
              </div>
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 bg-info-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Client Reports</h3>
                <p className="text-gray-600 text-sm">Generate plain-English financial summaries and insights</p>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Save 10+ Hours Per Week
              </h2>
              <p className="text-gray-600 mb-6">
                Automate your QuickBooks cleanup, receipt processing, and client reporting with AI.
                Focus on advisory services while we handle the data entry.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  Start Free Trial
                </button>
                <button className="border border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}