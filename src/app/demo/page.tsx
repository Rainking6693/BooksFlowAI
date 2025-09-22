import Link from 'next/link'
import { DemoReceiptUpload } from '@/components/demo/DemoReceiptUpload'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            See BooksFlowAI in Action
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Watch how our AI-powered platform transforms your accounting workflow in just 3 minutes.
          </p>
        </div>

        {/* Video Demo Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto mb-12">
          <div className="aspect-video bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg mb-6 flex items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <p className="text-white text-lg font-medium mb-2">Watch BooksFlowAI in Action</p>
              <p className="text-primary-100 text-sm mb-4">See how AI transforms accounting workflows</p>
              <button className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                ▶ Play Demo Video (3:24)
              </button>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-12 h-12 border-2 border-white border-opacity-20 rounded-full"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-2 border-white border-opacity-20 rounded-full"></div>
          </div>
          
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              What You'll See in This Demo:
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-primary-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">QuickBooks Integration</h4>
                  <p className="text-gray-600 text-sm">Connect your QuickBooks account in under 30 seconds</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-primary-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">AI Categorization</h4>
                  <p className="text-gray-600 text-sm">Watch AI categorize 100+ transactions in seconds</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mt-1">
                  <span className="text-primary-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Client Reports</h4>
                  <p className="text-gray-600 text-sm">Generate professional reports with one click</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Demo Features */}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-6xl mx-auto mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
            Try These Interactive Features
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* AI Categorization Demo */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">AI Transaction Categorization</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-800">STARBUCKS #1234</p>
                    <p className="text-sm text-gray-600">$4.95 • Dec 15, 2024</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-success-100 text-success-800 text-xs px-2 py-1 rounded-full">
                      Meals & Entertainment
                    </span>
                    <p className="text-xs text-gray-500 mt-1">95% confidence</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-800">OFFICE DEPOT #567</p>
                    <p className="text-sm text-gray-600">$127.43 • Dec 14, 2024</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-success-100 text-success-800 text-xs px-2 py-1 rounded-full">
                      Office Supplies
                    </span>
                    <p className="text-xs text-gray-500 mt-1">98% confidence</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-800">UBER TRIP</p>
                    <p className="text-sm text-gray-600">$23.50 • Dec 13, 2024</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-warning-100 text-warning-800 text-xs px-2 py-1 rounded-full">
                      Travel
                    </span>
                    <p className="text-xs text-gray-500 mt-1">87% confidence</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Processing Demo */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">AI-Powered OCR Receipt Processing</h4>
              <DemoReceiptUpload />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to Transform Your Accounting Practice?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join 500+ CPAs who've already automated their bookkeeping workflows. 
            Start your free trial today and experience the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth" className="bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg text-center">
              Start Free 14-Day Trial
            </Link>
            <Link href="/contact" className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-50 transition-colors text-center">
              Schedule Personal Demo
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            ✅ No credit card required • ✅ Setup in under 5 minutes • ✅ Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}