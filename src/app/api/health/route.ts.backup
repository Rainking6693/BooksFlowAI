import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'checking...',
        quickbooks: 'not_configured',
        ai: 'not_configured'
      }
    }

    // Check Supabase connection if configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        // Simple query to test connection
        const { error } = await supabase.from('profiles').select('count').limit(1)
        healthData.services.database = error ? 'error' : 'connected'
      } catch (error) {
        healthData.services.database = 'error'
      }
    } else {
      healthData.services.database = 'not_configured'
    }

    // Check QuickBooks configuration
    if (process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET) {
      healthData.services.quickbooks = 'configured'
    }

    // Check OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      healthData.services.ai = 'configured'
    }

    return NextResponse.json(healthData)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    )
  }
}