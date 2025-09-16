/**
 * Tests for AI Categorization API Endpoint
 * Critical API that handles transaction categorization
 */

import { POST, GET } from '@/app/api/ai/categorize/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            limit: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn(),
      insert: jest.fn()
    }))
  }
}))

jest.mock('@/lib/ai/openai-client', () => ({
  categorizeTransaction: jest.fn(),
  categorizeTransactionsBatch: jest.fn()
}))

describe('/api/ai/categorize', () => {
  const mockAccountantId = 'test-accountant-id'
  const mockTransactionIds = ['tx-1', 'tx-2']

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/ai/categorize', () => {
    it('should successfully categorize transactions', async () => {
      // Mock Supabase responses
      const { supabase } = require('@/lib/supabase')
      
      // Mock categories fetch
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { name: 'Office Supplies' },
                { name: 'Travel & Entertainment' }
              ],
              error: null
            }))
          }))
        }))
      })

      // Mock transactions fetch
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                {
                  id: 'tx-1',
                  description: 'Staples Purchase',
                  amount: 89.99,
                  vendor_name: 'Staples',
                  transaction_date: '2024-01-15'
                }
              ],
              error: null
            }))
          }))
        }))
      })

      // Mock transaction update
      supabase.from.mockReturnValueOnce({
        upsert: jest.fn(() => Promise.resolve({ error: null }))
      })

      // Mock activity log
      supabase.from.mockReturnValueOnce({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      })

      // Mock AI categorization
      const { categorizeTransaction } = require('@/lib/ai/openai-client')
      categorizeTransaction.mockResolvedValue({
        suggestedCategory: 'Office Supplies',
        confidence: 'high',
        confidenceScore: 0.95,
        reasoning: 'Clear vendor match',
        alternativeCategories: []
      })

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({
          transactionIds: mockTransactionIds,
          accountantId: mockAccountantId
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)
      expect(data.results).toHaveLength(1)
      expect(data.summary.highConfidence).toBe(1)
    })

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({
          // Missing accountantId
          transactionIds: mockTransactionIds
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock database error
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({
          transactionIds: mockTransactionIds,
          accountantId: mockAccountantId
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to fetch transaction categories')
    })

    it('should handle batch mode processing', async () => {
      // Setup mocks for batch processing
      const { supabase } = require('@/lib/supabase')
      const { categorizeTransactionsBatch } = require('@/lib/ai/openai-client')

      // Mock successful responses
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ name: 'Office Supplies' }],
              error: null
            })),
            in: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [
                  { id: 'tx-1', description: 'Test 1', amount: 100 },
                  { id: 'tx-2', description: 'Test 2', amount: 200 }
                ],
                error: null
              }))
            }))
          }))
        })),
        upsert: jest.fn(() => Promise.resolve({ error: null })),
        insert: jest.fn(() => Promise.resolve({ error: null }))
      })

      categorizeTransactionsBatch.mockResolvedValue([
        { suggestedCategory: 'Office Supplies', confidence: 'high', confidenceScore: 0.9 },
        { suggestedCategory: 'Travel', confidence: 'medium', confidenceScore: 0.8 }
      ])

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({
          transactionIds: ['tx-1', 'tx-2'],
          accountantId: mockAccountantId,
          batchMode: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(categorizeTransactionsBatch).toHaveBeenCalled()
    })
  })

  describe('GET /api/ai/categorize', () => {
    it('should return categorization statistics', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => Promise.resolve({
              data: [
                { ai_confidence: 'high', status: 'approved', created_at: '2024-01-15' },
                { ai_confidence: 'medium', status: 'pending', created_at: '2024-01-16' },
                { ai_confidence: 'low', status: 'rejected', created_at: '2024-01-17' }
              ],
              error: null
            }))
          }))
        }))
      })

      const url = new URL('http://localhost:3000/api/ai/categorize')
      url.searchParams.set('accountantId', mockAccountantId)
      
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.statistics).toEqual({
        totalCategorized: 3,
        highConfidence: 1,
        mediumConfidence: 1,
        lowConfidence: 1,
        approved: 1,
        rejected: 1,
        pending: 1,
        recentActivity: expect.any(Array)
      })
    })

    it('should return 400 for missing accountantId', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing accountantId parameter')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })

    it('should handle AI service failures', async () => {
      const { supabase } = require('@/lib/supabase')
      const { categorizeTransaction } = require('@/lib/ai/openai-client')

      // Mock successful database calls
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ name: 'Office Supplies' }],
              error: null
            })),
            in: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [{ id: 'tx-1', description: 'Test', amount: 100 }],
                error: null
              }))
            }))
          }))
        })),
        upsert: jest.fn(() => Promise.resolve({ error: null })),
        insert: jest.fn(() => Promise.resolve({ error: null }))
      })

      // Mock AI failure
      categorizeTransaction.mockRejectedValue(new Error('AI Service Unavailable'))

      const request = new NextRequest('http://localhost:3000/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({
          transactionIds: ['tx-1'],
          accountantId: mockAccountantId
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Should still succeed with fallback
      expect(data.results[0].suggestedCategory).toBe('Uncategorized')
    })
  })
})