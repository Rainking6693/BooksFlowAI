import { NextResponse } from 'next/server'
import { isServerConfigured } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      demoMode: !isServerConfigured(),
      services: {
        database: 'checking...',
        quickbooks: 'not_configured',
        ai: 'not_configured',
        ocr: 'not_configured'
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
        
        // Try to query a simple table or use a health check function
        const { error } = await supabase.rpc('health_check').single()
        if (error && error.code === '42883') {
          // Function doesn't exist, try a basic query
          const { error: queryError } = await supabase.from('accountants').select('count').limit(1)
          healthData.services.database = queryError ? 'error' : 'connected'
        } else {
          healthData.services.database = error ? 'error' : 'connected'
        }
      } catch (error) {
        healthData.services.database = 'error'
        if (process.env.NODE_ENV === 'development') {
          healthData.services.database = `error: ${error instanceof Error ? error.message : 'unknown'}`
        }
      }
    } else {
      healthData.services.database = 'not_configured'
    }

    // Check QuickBooks configuration
    if (process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET) {
      healthData.services.quickbooks = 'configured'
    }

    // Check OpenAI configuration
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'test-openai-key') {
      healthData.services.ai = 'configured'
    }

    // Check OCR configuration
    if (process.env.MINDEE_API_KEY && process.env.MINDEE_API_KEY !== 'test-mindee-key') {
      healthData.services.ocr = 'configured'
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