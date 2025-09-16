/**
 * Tests for LoginForm Component
 * Critical authentication component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn()
    }
  }
}))

describe('LoginForm', () => {
  const mockOnSuccess = jest.fn()
  const mockOnToggleMode = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form correctly', () => {
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your Solo Accountant AI account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    const { supabase } = require('@/lib/supabase')
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null
    })

    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    // Fill in form
    await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('displays error message on login failure', async () => {
    const { supabase } = require('@/lib/supabase')
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    })

    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const { supabase } = require('@/lib/supabase')
    supabase.auth.signInWithPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    await user.click(submitButton)

    // Button should be disabled and show loading state
    expect(submitButton).toBeDisabled()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    // Try to submit without filling fields
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('calls onToggleMode when sign up link is clicked', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    await user.click(screen.getByText("Don't have an account? Sign up"))
    expect(mockOnToggleMode).toHaveBeenCalled()
  })

  it('handles network errors gracefully', async () => {
    const { supabase } = require('@/lib/supabase')
    supabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<LoginForm onSuccess={mockOnSuccess} onToggleMode={mockOnToggleMode} />)

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(emailInput).toHaveAttribute('id')
    expect(passwordInput).toHaveAttribute('id')
  })
})