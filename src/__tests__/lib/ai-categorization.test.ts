/**
 * Tests for AI Categorization System
 * Critical functionality that must be thoroughly tested
 */

import { categorizeTransaction, categorizeTransactionsBatch } from '@/lib/ai/openai-client'
import type { TransactionCategorizationRequest } from '@/lib/ai/openai-client'

// Mock OpenAI to avoid API calls in tests
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}))

describe('AI Categorization System', () => {
  const mockCategories = [
    'Office Supplies',
    'Travel & Entertainment', 
    'Professional Services',
    'Marketing & Advertising',
    'Utilities',
    'Software & Subscriptions'
  ]

  const mockTransaction: TransactionCategorizationRequest = {
    description: 'Staples Office Supplies Purchase',
    amount: 89.99,
    vendor: 'Staples',
    date: '2024-01-15',
    accountName: 'Business Checking',
    existingCategories: mockCategories
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful OpenAI response
    const mockOpenAI = require('openai').default
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  suggestedCategory: 'Office Supplies',
                  confidence: 'high',
                  reasoning: 'Clear vendor match with Staples, typical office supply amount',
                  alternativeCategories: ['Business Expenses'],
                  confidenceScore: 0.95
                })
              }
            }]
          })
        }
      }
    }))
  })

  describe('categorizeTransaction', () => {
    it('should successfully categorize a clear transaction', async () => {
      const result = await categorizeTransaction(mockTransaction)

      expect(result).toEqual({
        suggestedCategory: 'Office Supplies',
        confidence: 'high',
        reasoning: 'Clear vendor match with Staples, typical office supply amount',
        alternativeCategories: ['Business Expenses'],
        confidenceScore: 0.95
      })
    })

    it('should handle missing vendor gracefully', async () => {
      const transactionWithoutVendor = {
        ...mockTransaction,
        vendor: undefined
      }

      const result = await categorizeTransaction(transactionWithoutVendor)
      expect(result.suggestedCategory).toBeDefined()
      expect(result.confidence).toMatch(/^(high|medium|low)$/)
    })

    it('should normalize confidence scores correctly', async () => {
      // Test high confidence (>= 0.9)
      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    suggestedCategory: 'Office Supplies',
                    confidenceScore: 0.95
                  })
                }
              }]
            })
          }
        }
      }))

      const result = await categorizeTransaction(mockTransaction)
      expect(result.confidence).toBe('high')
    })

    it('should handle API errors gracefully', async () => {
      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }))

      const result = await categorizeTransaction(mockTransaction)
      
      expect(result).toEqual({
        suggestedCategory: 'Uncategorized',
        confidence: 'low',
        reasoning: 'Unable to categorize automatically. Manual review required.',
        alternativeCategories: [],
        confidenceScore: 0
      })
    })

    it('should handle invalid JSON responses', async () => {
      const mockOpenAI = require('openai').default
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Invalid JSON response'
                }
              }]
            })
          }
        }
      }))

      const result = await categorizeTransaction(mockTransaction)
      expect(result.suggestedCategory).toBe('Uncategorized')
      expect(result.confidence).toBe('low')
    })
  })

  describe('categorizeTransactionsBatch', () => {
    it('should process multiple transactions', async () => {
      const transactions = [
        mockTransaction,
        {
          ...mockTransaction,
          description: 'Google Ads Campaign',
          vendor: 'Google',
          amount: 500.00
        }
      ]

      const results = await categorizeTransactionsBatch(transactions)
      
      expect(results).toHaveLength(2)
      expect(results[0].suggestedCategory).toBeDefined()
      expect(results[1].suggestedCategory).toBeDefined()
    })

    it('should handle partial failures in batch processing', async () => {
      const mockOpenAI = require('openai').default
      let callCount = 0
      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                return Promise.resolve({
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        suggestedCategory: 'Office Supplies',
                        confidence: 'high',
                        confidenceScore: 0.95
                      })
                    }
                  }]
                })
              } else {
                return Promise.reject(new Error('API Error'))
              }
            })
          }
        }
      }))

      const transactions = [mockTransaction, mockTransaction]
      const results = await categorizeTransactionsBatch(transactions)
      
      expect(results).toHaveLength(2)
      expect(results[0].suggestedCategory).toBe('Office Supplies')
      expect(results[1].suggestedCategory).toBe('Uncategorized')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      const largeTransaction = {
        ...mockTransaction,
        amount: 50000.00,
        description: 'Equipment Purchase'
      }

      const result = await categorizeTransaction(largeTransaction)
      expect(result.suggestedCategory).toBeDefined()
    })

    it('should handle negative amounts (refunds)', async () => {
      const refundTransaction = {
        ...mockTransaction,
        amount: -89.99,
        description: 'Refund from Staples'
      }

      const result = await categorizeTransaction(refundTransaction)
      expect(result.suggestedCategory).toBeDefined()
    })

    it('should handle empty or minimal descriptions', async () => {
      const minimalTransaction = {
        ...mockTransaction,
        description: 'Payment',
        vendor: undefined
      }

      const result = await categorizeTransaction(minimalTransaction)
      expect(result.confidence).toBe('low')
    })
  })
})