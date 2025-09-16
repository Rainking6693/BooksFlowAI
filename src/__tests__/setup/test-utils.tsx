/**
 * Test utilities for Solo Accountant AI
 * Provides common test setup and utilities
 */

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { jest } from '@jest/globals'

// Mock Supabase client for tests
export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn()
      })),
      in: jest.fn(() => ({
        eq: jest.fn()
      })),
      not: jest.fn()
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn()
    })),
    upsert: jest.fn(),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
}

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/'
}

// Test data factories
export const createMockTransaction = (overrides = {}) => ({
  id: 'tx-123',
  description: 'Test Transaction',
  amount: 100.00,
  vendor_name: 'Test Vendor',
  transaction_date: '2024-01-15',
  ai_confidence: 'high' as const,
  ai_reasoning: 'Test reasoning',
  status: 'pending' as const,
  category_name: 'Office Supplies',
  ...overrides
})

export const createMockAccountant = (overrides = {}) => ({
  id: 'acc-123',
  user_id: 'user-123',
  firm_name: 'Test CPA Firm',
  subscription_tier: 'pro' as const,
  quickbooks_connected: true,
  ...overrides
})

export const createMockClient = (overrides = {}) => ({
  id: 'client-123',
  user_id: 'user-456',
  accountant_id: 'acc-123',
  business_name: 'Test Business LLC',
  business_type: 'Restaurant',
  ...overrides
})

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialState, ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    // Add any providers here (Redux, Context, etc.)
    return <>{children}</>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Async test helpers
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

export const flushPromises = () => new Promise(setImmediate)

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data))
})

// Error simulation helpers
export const simulateNetworkError = () => {
  throw new Error('Network Error')
}

export const simulateApiError = (status: number, message: string) => {
  const error = new Error(message)
  ;(error as any).status = status
  throw error
}

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const checkAccessibility = (element: HTMLElement) => {
  // Check for basic accessibility requirements
  const checks = {
    hasAriaLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
    hasRole: element.hasAttribute('role'),
    isKeyboardAccessible: element.tabIndex >= 0 || element.tagName === 'BUTTON' || element.tagName === 'A',
    hasProperContrast: true // Would need actual color contrast checking
  }
  
  return checks
}

// Form testing helpers
export const fillForm = async (form: HTMLFormElement, data: Record<string, string>) => {
  const { fireEvent } = await import('@testing-library/react')
  
  Object.entries(data).forEach(([name, value]) => {
    const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement
    if (field) {
      fireEvent.change(field, { target: { value } })
    }
  })
}

// Local storage mocking
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    })
  }
}

// Console error suppression for expected errors
export const suppressConsoleError = (expectedMessage: string) => {
  const originalError = console.error
  console.error = (...args: any[]) => {
    if (!args[0]?.includes?.(expectedMessage)) {
      originalError(...args)
    }
  }
  
  return () => {
    console.error = originalError
  }
}

// Test environment validation
export const validateTestEnvironment = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY'
  ]
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missing.length > 0) {
    throw new Error(`Missing test environment variables: ${missing.join(', ')}`)
  }
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'