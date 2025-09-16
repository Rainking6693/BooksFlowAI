/**
 * Tests for Configuration Management System
 * Critical system configuration validation
 */

import { validateConfig, getEnvironmentConfig, APP_CONFIG } from '@/lib/config'

describe('Configuration Management', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Environment Validation', () => {
    it('should validate required environment variables', () => {
      // Set required environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
      process.env.OPENAI_API_KEY = 'test-openai-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-qb-client'
      process.env.QUICKBOOKS_CLIENT_SECRET = 'test-qb-secret'
      process.env.QUICKBOOKS_REDIRECT_URI = 'https://test.com/callback'
      process.env.MINDEE_API_KEY = 'test-mindee-key'
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'

      expect(() => validateConfig()).not.toThrow()
    })

    it('should throw error for missing critical configuration', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => validateConfig()).toThrow('Critical configuration missing')
    })

    it('should validate URL formats', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url'
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-client'

      expect(() => validateConfig()).toThrow()
    })

    it('should validate email formats', () => {
      process.env.EMAIL_FROM = 'invalid-email'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-client'

      expect(() => validateConfig()).toThrow()
    })

    it('should set default values for optional fields', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-client'
      process.env.QUICKBOOKS_CLIENT_SECRET = 'test-secret'
      process.env.QUICKBOOKS_REDIRECT_URI = 'https://test.com/callback'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.MINDEE_API_KEY = 'test-mindee-key'

      // Don't set NODE_ENV to test default
      delete process.env.NODE_ENV

      expect(() => validateConfig()).not.toThrow()
    })
  })

  describe('Configuration Constants', () => {
    it('should have proper performance thresholds', () => {
      expect(APP_CONFIG.PERFORMANCE.API_TIMEOUT).toBe(30000)
      expect(APP_CONFIG.PERFORMANCE.PAGE_LOAD_TARGET).toBe(3000)
      expect(APP_CONFIG.PERFORMANCE.API_RESPONSE_TARGET).toBe(500)
    })

    it('should have proper rate limits', () => {
      expect(APP_CONFIG.RATE_LIMITS.AI_REQUESTS_PER_MINUTE).toBe(60)
      expect(APP_CONFIG.RATE_LIMITS.API_REQUESTS_PER_MINUTE).toBe(1000)
      expect(APP_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS_PER_HOUR).toBe(5)
    })

    it('should have proper file upload limits', () => {
      expect(APP_CONFIG.UPLOAD.MAX_FILE_SIZE).toBe(10 * 1024 * 1024) // 10MB
      expect(APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES).toContain('image/jpeg')
      expect(APP_CONFIG.UPLOAD.ALLOWED_MIME_TYPES).toContain('application/pdf')
    })

    it('should have proper AI configuration', () => {
      expect(APP_CONFIG.AI.BATCH_SIZE).toBe(5)
      expect(APP_CONFIG.AI.CONFIDENCE_THRESHOLDS.HIGH).toBe(0.9)
      expect(APP_CONFIG.AI.CONFIDENCE_THRESHOLDS.MEDIUM).toBe(0.7)
      expect(APP_CONFIG.AI.RETRY_ATTEMPTS).toBe(3)
    })

    it('should have proper security settings', () => {
      expect(APP_CONFIG.SECURITY.PASSWORD_MIN_LENGTH).toBe(8)
      expect(APP_CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS).toBe(5)
      expect(APP_CONFIG.SECURITY.SESSION_TIMEOUT).toBe(24 * 60 * 60 * 1000) // 24 hours
    })
  })

  describe('Environment-Specific Configuration', () => {
    it('should apply development overrides', () => {
      process.env.NODE_ENV = 'development'
      
      const config = getEnvironmentConfig()
      
      expect(config.PERFORMANCE.API_TIMEOUT).toBe(60000) // Longer timeout for debugging
      expect(config.RATE_LIMITS.AI_REQUESTS_PER_MINUTE).toBe(10) // Lower rate limit
    })

    it('should apply test overrides', () => {
      process.env.NODE_ENV = 'test'
      
      const config = getEnvironmentConfig()
      
      expect(config.PERFORMANCE.API_TIMEOUT).toBe(5000) // Shorter timeout for tests
      expect(config.AI.RETRY_ATTEMPTS).toBe(1) // No retries in tests
    })

    it('should use base config for production', () => {
      process.env.NODE_ENV = 'production'
      
      const config = getEnvironmentConfig()
      
      expect(config.PERFORMANCE.API_TIMEOUT).toBe(APP_CONFIG.PERFORMANCE.API_TIMEOUT)
      expect(config.AI.RETRY_ATTEMPTS).toBe(APP_CONFIG.AI.RETRY_ATTEMPTS)
    })
  })

  describe('Type Safety', () => {
    it('should export proper TypeScript types', () => {
      // This test ensures the types are properly exported
      const config: typeof APP_CONFIG = APP_CONFIG
      
      expect(config).toBeDefined()
      expect(typeof config.PERFORMANCE.API_TIMEOUT).toBe('number')
      expect(typeof config.FEATURES.AI_CATEGORIZATION).toBe('boolean')
    })

    it('should have readonly configuration', () => {
      // Attempt to modify configuration should not affect the original
      const config = { ...APP_CONFIG }
      config.PERFORMANCE.API_TIMEOUT = 999999
      
      expect(APP_CONFIG.PERFORMANCE.API_TIMEOUT).toBe(30000)
    })
  })

  describe('Configuration Validation Edge Cases', () => {
    it('should handle empty string environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ''
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-client'

      expect(() => validateConfig()).toThrow()
    })

    it('should handle numeric string conversion', () => {
      process.env.OPENAI_MAX_TOKENS = '1500'
      process.env.OPENAI_TEMPERATURE = '0.2'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-client'
      process.env.QUICKBOOKS_CLIENT_SECRET = 'test-secret'
      process.env.QUICKBOOKS_REDIRECT_URI = 'https://test.com/callback'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
      process.env.MINDEE_API_KEY = 'test-mindee-key'

      expect(() => validateConfig()).not.toThrow()
    })

    it('should handle invalid numeric strings', () => {
      process.env.OPENAI_TEMPERATURE = 'invalid-number'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_APP_URL = 'https://test.com'
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.QUICKBOOKS_CLIENT_ID = 'test-client'

      expect(() => validateConfig()).toThrow()
    })
  })
})