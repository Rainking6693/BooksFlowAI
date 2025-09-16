/**
 * Production-grade configuration management
 * NO MAGIC NUMBERS OR HARDCODED VALUES ALLOWED
 */

import { z } from 'zod'

// Environment variable validation schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // AI Services
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(2000),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  OPENAI_TIMEOUT: z.coerce.number().default(30000),
  
  // QuickBooks Integration
  QUICKBOOKS_CLIENT_ID: z.string().min(1),
  QUICKBOOKS_CLIENT_SECRET: z.string().min(1),
  QUICKBOOKS_REDIRECT_URI: z.string().url(),
  QUICKBOOKS_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  
  // OCR Services
  MINDEE_API_KEY: z.string().min(1).optional(),
  
  // Email Services
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.coerce.number().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  VERCEL_ANALYTICS_ID: z.string().optional(),
})

// Validate environment variables at startup
function validateEnvironment() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment configuration:')
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    process.exit(1)
  }
}

// Validated environment variables
export const env = validateEnvironment()

// Application configuration constants
export const APP_CONFIG = {
  // Performance thresholds
  PERFORMANCE: {
    API_TIMEOUT: 30000, // 30 seconds
    PAGE_LOAD_TARGET: 3000, // 3 seconds
    API_RESPONSE_TARGET: 500, // 500ms
    DATABASE_QUERY_TARGET: 100, // 100ms
    AI_PROCESSING_TARGET: 10000, // 10 seconds
  },
  
  // Rate limiting
  RATE_LIMITS: {
    AI_REQUESTS_PER_MINUTE: 60,
    API_REQUESTS_PER_MINUTE: 1000,
    UPLOAD_REQUESTS_PER_MINUTE: 30,
    LOGIN_ATTEMPTS_PER_HOUR: 5,
  },
  
  // File upload limits
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ],
    MAX_FILES_PER_UPLOAD: 10,
  },
  
  // AI processing
  AI: {
    BATCH_SIZE: 5,
    CONFIDENCE_THRESHOLDS: {
      HIGH: 0.9,
      MEDIUM: 0.7,
      LOW: 0.0,
    },
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Database
  DATABASE: {
    CONNECTION_TIMEOUT: 10000, // 10 seconds
    QUERY_TIMEOUT: 30000, // 30 seconds
    MAX_CONNECTIONS: 20,
    IDLE_TIMEOUT: 300000, // 5 minutes
  },
  
  // Security
  SECURITY: {
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    PASSWORD_MIN_LENGTH: 8,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    CSRF_TOKEN_LENGTH: 32,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 25,
    MAX_PAGE_SIZE: 100,
    DEFAULT_SORT: 'created_at',
    DEFAULT_ORDER: 'desc' as const,
  },
  
  // Caching
  CACHE: {
    DEFAULT_TTL: 300, // 5 minutes
    LONG_TTL: 3600, // 1 hour
    SHORT_TTL: 60, // 1 minute
  },
  
  // Feature flags
  FEATURES: {
    AI_CATEGORIZATION: true,
    OCR_PROCESSING: true,
    BATCH_OPERATIONS: true,
    REAL_TIME_SYNC: true,
    ADVANCED_REPORTING: true,
  },
  
  // Business rules
  BUSINESS: {
    FREE_TIER_TRANSACTION_LIMIT: 100,
    PRO_TIER_TRANSACTION_LIMIT: 1000,
    ENTERPRISE_TIER_TRANSACTION_LIMIT: 10000,
    MAX_CLIENTS_PER_ACCOUNTANT: 100,
    TRIAL_PERIOD_DAYS: 14,
  },
} as const

// QuickBooks specific configuration
export const QUICKBOOKS_CONFIG = {
  OAUTH: {
    SCOPE: 'com.intuit.quickbooks.accounting',
    DISCOVERY_DOCUMENT_URL: 'https://appcenter.intuit.com/api/v1/connection/oauth2',
    TOKEN_URL: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  },
  API: {
    SANDBOX_BASE_URL: 'https://sandbox-quickbooks.api.intuit.com',
    PRODUCTION_BASE_URL: 'https://quickbooks.api.intuit.com',
    VERSION: 'v3',
    RATE_LIMIT: 500, // requests per minute
    TIMEOUT: 30000, // 30 seconds
  },
  SYNC: {
    DEFAULT_LOOKBACK_DAYS: 30,
    MAX_LOOKBACK_DAYS: 365,
    BATCH_SIZE: 100,
    RETRY_ATTEMPTS: 3,
  },
} as const

// OpenAI specific configuration
export const OPENAI_CONFIG = {
  MODEL: env.OPENAI_MODEL,
  MAX_TOKENS: env.OPENAI_MAX_TOKENS,
  TEMPERATURE: env.OPENAI_TEMPERATURE,
  TIMEOUT: env.OPENAI_TIMEOUT,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT: 60, // requests per minute
} as const

// Supabase configuration
export const SUPABASE_CONFIG = {
  URL: env.NEXT_PUBLIC_SUPABASE_URL,
  ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  AUTH: {
    AUTO_REFRESH_TOKEN: true,
    PERSIST_SESSION: true,
    DETECT_SESSION_IN_URL: true,
  },
  REALTIME: {
    ENABLED: true,
    HEARTBEAT_INTERVAL: 30000,
  },
} as const

// Validation functions
export function validateConfig() {
  // Validate critical configuration at startup
  const criticalChecks = [
    { name: 'Supabase URL', value: env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'OpenAI API Key', value: env.OPENAI_API_KEY },
    { name: 'QuickBooks Client ID', value: env.QUICKBOOKS_CLIENT_ID },
  ]

  const missing = criticalChecks.filter(check => !check.value)
  if (missing.length > 0) {
    console.error('❌ Missing critical configuration:')
    missing.forEach(check => console.error(`  - ${check.name}`))
    throw new Error('Critical configuration missing')
  }

    // Configuration validation passed - using logger in production
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Configuration validation passed')
    }
}

// Environment-specific overrides
export function getEnvironmentConfig() {
  const baseConfig = { ...APP_CONFIG }
  
  if (env.NODE_ENV === 'development') {
    // Development overrides
    baseConfig.PERFORMANCE.API_TIMEOUT = 60000 // Longer timeout for debugging
    baseConfig.RATE_LIMITS.AI_REQUESTS_PER_MINUTE = 10 // Lower rate limit
  } else if (env.NODE_ENV === 'test') {
    // Test overrides
    baseConfig.PERFORMANCE.API_TIMEOUT = 5000 // Shorter timeout for tests
    baseConfig.AI.RETRY_ATTEMPTS = 1 // No retries in tests
  }
  
  return baseConfig
}

// Type exports for TypeScript
export type AppConfig = typeof APP_CONFIG
export type Environment = z.infer<typeof envSchema>

// Initialize configuration validation on import
if (typeof window === 'undefined') {
  // Only validate on server side
  validateConfig()
}