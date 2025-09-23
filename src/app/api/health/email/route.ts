import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase environment variables not configured',
        details: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!supabaseAnonKey
        }
      }, { status: 500 })
    }

    // Test Supabase connection
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase connection failed',
        error: error.message
      }, { status: 500 })
    }

    // Check email configuration
    const emailConfig = {
      smtpHost: process.env.EMAIL_SERVER_HOST,
      smtpUser: process.env.EMAIL_SERVER_USER,
      emailFrom: process.env.EMAIL_FROM
    }

    const hasEmailConfig = !!(emailConfig.smtpHost && emailConfig.smtpUser && emailConfig.emailFrom)

    return NextResponse.json({
      status: 'ok',
      message: 'Health check passed',
      timestamp: new Date().toISOString(),
      supabase: {
        connected: true,
        url: supabaseUrl,
        hasSession: !!data.session
      },
      email: {
        configured: hasEmailConfig,
        config: {
          hasSmtpHost: !!emailConfig.smtpHost,
          hasSmtpUser: !!emailConfig.smtpUser,
          hasEmailFrom: !!emailConfig.emailFrom
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}