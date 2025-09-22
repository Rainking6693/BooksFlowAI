'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export default function ThankYouPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already verified
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        router.push('/dashboard')
      } else if (user?.email) {
        setEmail(user.email)
      }
    }

    checkVerification()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.email_confirmed_at) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const resendVerification = async () => {
    if (!email || resending) return

    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        console.error('Error resending verification:', error.message)
        alert('Error resending verification email. Please try again.')
      } else {
        setResent(true)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error resending verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-success-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Check Your Email!
            </h1>
            
            <p className="text-gray-600 mb-6">
              We've sent a verification link to:
              <br />
              <span className="font-medium text-gray-900">{email || 'your email address'}</span>
            </p>

            <p className="text-sm text-gray-500 mb-8">
              Click the link in the email to verify your account and access your dashboard.
              The link will expire in 24 hours.
            </p>

            {/* Resend Verification */}
            <div className="space-y-4">
              {!resent ? (
                <Button
                  onClick={resendVerification}
                  variant="outline"
                  loading={resending}
                  className="w-full"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              ) : (
                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg">
                  ✅ Verification email sent! Check your inbox.
                </div>
              )}

              <Button
                onClick={() => router.push('/auth')}
                variant="ghost"
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Not seeing the email?
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you entered the correct email address</li>
              <li>• Wait a few minutes for the email to arrive</li>
              <li>• Check that your email provider isn't blocking our emails</li>
            </ul>
            
            <div className="mt-4">
              <Link href="/contact" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Still need help? Contact support →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
