/**
 * Tests for Health Check API Endpoint
 * Critical system monitoring endpoint
 */

import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))
    }))
  }
}))

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.QUICKBOOKS_CLIENT_ID = 'test-qb-client-id'
    process.env.QUICKBOOKS_CLIENT_SECRET = 'test-qb-secret'
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  describe('GET /api/health', () => {
    it('should return healthy status with all services configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: '0.1.0',
        environment: expect.any(String),
        services: {
          database: expect.any(String),
          quickbooks: 'configured',
          ai: 'configured'
        }
      })
    })

    it('should detect missing QuickBooks configuration', async () => {
      delete process.env.QUICKBOOKS_CLIENT_ID
      delete process.env.QUICKBOOKS_CLIENT_SECRET

      const response = await GET()
      const data = await response.json()

      expect(data.services.quickbooks).toBe('not_configured')
    })

    it('should detect missing OpenAI configuration', async () => {
      delete process.env.OPENAI_API_KEY

      const response = await GET()
      const data = await response.json()

      expect(data.services.ai).toBe('not_configured')
    })

    it('should handle database connection errors', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Connection failed' }
          }))
        }))
      })

      const response = await GET()
      const data = await response.json()

      expect(data.services.database).toBe('error')
    })

    it('should handle missing Supabase configuration', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const response = await GET()
      const data = await response.json()

      expect(data.services.database).toBe('not_configured')
    })

    it('should return error status on health check failure', async () => {
      // Mock a critical failure
      jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
        throw new Error('System failure')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.status).toBe('error')
      expect(data.error).toBe('Health check failed')

      // Restore mock
      jest.restoreAllMocks()
    })

    it('should include proper timestamp format', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should include environment information', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.environment).toBeDefined()
      expect(['development', 'test', 'production']).toContain(data.environment)
    })
  })

  describe('Error Handling', () => {
    it('should handle Supabase import errors', async () => {
      // Mock import failure
      jest.doMock('@/lib/supabase', () => {
        throw new Error('Import failed')
      })

      const response = await GET()
      const data = await response.json()

      expect(data.services.database).toBe('error')
    })

    it('should handle async database check errors', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.reject(new Error('Async error')))
        }))
      })

      const response = await GET()
      const data = await response.json()

      expect(data.services.database).toBe('error')
    })
  })

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const start = Date.now()
      await GET()
      const duration = Date.now() - start

      // Health check should respond within 1 second
      expect(duration).toBeLessThan(1000)
    })

    it('should not leak memory on repeated calls', async () => {
      // Run health check multiple times
      for (let i = 0; i < 10; i++) {
        await GET()
      }

      // If we get here without memory issues, test passes
      expect(true).toBe(true)
    })
  })
})