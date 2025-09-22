/**
 * Server-side Supabase clients for API routes
 */

import { createClient } from '@supabase/supabase-js'
import { env } from './config'

// Admin client with service role key - bypasses RLS
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'https://localhost:3000',
  env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper to check if we have proper server configuration
export const isServerConfigured = () => {
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) &&
         env.NEXT_PUBLIC_SUPABASE_URL !== 'https://localhost:3000' &&
         env.SUPABASE_SERVICE_ROLE_KEY !== 'test-service-role-key'
}

// Demo/fallback mode detection
export const isDemoMode = () => {
  return !isServerConfigured()
}
