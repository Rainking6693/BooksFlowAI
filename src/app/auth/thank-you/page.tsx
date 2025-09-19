'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export default function ThankYouPage() {
  const [email, setEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Get the current user's email
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }
    }
    getUser()
  }, [])

  const handleGoToLogin = () => {
    router.push('/auth')
  }

  const handleResendEmail = async () => {
    if (email) {
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: email,
        })
        alert('Verification email sent! Please check your inbox.')
      } catch (error) {
        console.error('Error resending email:', error)
        alert('Failed to resend email. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-success-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Thank You Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Thank You for Signing Up!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Welcome to Solo Accountant AI! We're excited to help you automate your QuickBooks workflow.
            </p>

            {/* Email Verification Instructions */}
            <div className="bg-info-50 border border-info-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="w-5 h-5 bg-info-100 rounded-full flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                  <svg className="w-3 h-3 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-info-800 mb-1">
                    Verify Your Email
                  </h3>
                  <p className="text-sm text-info-700">
                    Please check your email {email && `at ${email}`} for a verification link. You'll need to verify your email before accessing your dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="text-left mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Next Steps:</h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs font-semibold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                  Check your email inbox for a verification message
                </li>
                <li className="flex items-start">
                  <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs font-semibold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                  Click the verification link in the email
                </li>
                <li className="flex items-start">
                  <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs font-semibold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                  Return here and log in to access your dashboard
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleGoToLogin}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Go to Login
              </Button>
              
              <button
                onClick={handleResendEmail}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Didn't receive the email? Resend verification
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Need help? Contact us at support@soloaccountantai.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}