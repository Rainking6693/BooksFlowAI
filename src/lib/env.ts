// Environment variable validation and type safety
import { z } from 'zod'

const envSchema = z.object({
  // App configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3003'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:8000'),
  
  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(2000),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  
  // External APIs
  GOOGLE_BOOKS_API_KEY: z.string().optional(),
  GOODREADS_API_KEY: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().url().optional()
  ),
  VERCEL_ANALYTICS_ID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ')
      throw new Error(`Missing or invalid environment variables: ${missingVars}`)
    }
    throw error
  }
}

export const env = validateEnv()

// Utility functions for environment checks
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// Feature flags based on environment
export const features = {
  enableAnalytics: isProduction && !!env.VERCEL_ANALYTICS_ID,
  enableSentry: isProduction && !!env.SENTRY_DSN,
  enableAuth: !!env.NEXTAUTH_SECRET,
  enableAI: !!env.OPENAI_API_KEY,
  enableSupabase: !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY,
} as const