/**
 * Production-grade Error Boundary Component
 * COMPREHENSIVE ERROR HANDLING - USER-FRIENDLY FALLBACKS
 */

'use client'

import React from 'react'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId?: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, level = 'component' } = this.props
    const { errorId } = this.state

    // Log error with comprehensive context
    logger.error('React Error Boundary caught error', error, {
      type: 'react_error_boundary',
      level,
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      props: this.props,
      timestamp: new Date().toISOString()
    })

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo)
      } catch (handlerError) {
        logger.error('Error in custom error handler', handlerError as Error, {
          type: 'error_handler_failure',
          originalErrorId: errorId
        })
      }
    }

    // Update state with error info
    this.setState({ errorInfo })

    // Report to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportToMonitoring(error, errorInfo, errorId)
    }
  }

  private reportToMonitoring = (error: Error, errorInfo: React.ErrorInfo, errorId?: string) => {
    // In production, report to Sentry, LogRocket, etc.
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            errorBoundary: true,
            errorId,
            level: this.props.level
          },
          extra: {
            componentStack: errorInfo.componentStack,
            props: this.props
          }
        })
      }
    } catch (reportingError) {
      logger.error('Failed to report error to monitoring service', reportingError as Error, {
        type: 'monitoring_failure',
        originalErrorId: errorId
      })
    }
  }

  private handleRetry = () => {
    const { errorId } = this.state

    logger.info('User initiated error boundary retry', {
      type: 'error_boundary_retry',
      errorId,
      level: this.props.level
    })

    // Clear error state to retry rendering
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined
    })

    // Set a timeout to prevent infinite retry loops
    this.retryTimeoutId = setTimeout(() => {
      if (this.state.hasError) {
        logger.warn('Error boundary retry failed, error persisted', {
          type: 'error_boundary_retry_failed',
          errorId
        })
      }
    }, 1000)
  }

  private handleReload = () => {
    logger.info('User initiated page reload from error boundary', {
      type: 'error_boundary_reload',
      errorId: this.state.errorId,
      level: this.props.level
    })

    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback: CustomFallback, level = 'component' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (CustomFallback) {
        return <CustomFallback error={error} retry={this.handleRetry} />
      }

      // Default fallback UI based on error level
      return this.renderDefaultFallback(error, errorId, level)
    }

    return children
  }

  private renderDefaultFallback(error: Error, errorId?: string, level: string = 'component') {
    const isDevelopment = process.env.NODE_ENV === 'development'

    // Critical level errors get full-page treatment
    if (level === 'critical' || level === 'page') {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100 mb-4">
                  <svg className="h-6 w-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
                </p>
                
                {isDevelopment && (
                  <div className="bg-error-50 border border-error-200 rounded-md p-4 mb-6 text-left">
                    <h3 className="text-sm font-medium text-error-800 mb-2">Development Error Details:</h3>
                    <p className="text-xs text-error-700 font-mono break-all">{error.message}</p>
                    {errorId && (
                      <p className="text-xs text-error-600 mt-2">Error ID: {errorId}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={this.handleRetry}
                    variant="primary"
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1"
                  >
                    Reload Page
                  </Button>
                </div>

                {errorId && (
                  <p className="text-xs text-gray-500 mt-4">
                    Reference ID: {errorId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Component level errors get inline treatment
    return (
      <div className="bg-error-50 border border-error-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-error-800">
              Component Error
            </h3>
            <p className="text-sm text-error-700 mt-1">
              This component encountered an error and couldn't render properly.
            </p>
            
            {isDevelopment && (
              <div className="mt-2 text-xs text-error-600 font-mono bg-error-100 p-2 rounded">
                {error.message}
              </div>
            )}

            <div className="mt-3">
              <Button
                onClick={this.handleRetry}
                size="sm"
                variant="outline"
              >
                Retry Component
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized error boundaries for different use cases
export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">
    {children}
  </ErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component">
    {children}
  </ErrorBoundary>
)

export const CriticalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical">
    {children}
  </ErrorBoundary>
)

// Custom fallback components
export const DashboardErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="bg-white shadow rounded-lg p-6">
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100 mb-4">
        <svg className="h-6 w-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Unavailable</h3>
      <p className="text-sm text-gray-600 mb-4">
        The dashboard encountered an error and couldn't load. Please try refreshing.
      </p>
      <Button onClick={retry} variant="primary">
        Refresh Dashboard
      </Button>
    </div>
  </div>
)

export const TransactionErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="bg-warning-50 border border-warning-200 rounded-md p-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-warning-800">
          Transaction Loading Error
        </h3>
        <p className="text-sm text-warning-700 mt-1">
          Unable to load transaction data. This might be a temporary issue.
        </p>
        <div className="mt-3">
          <Button onClick={retry} size="sm" variant="outline">
            Retry Loading
          </Button>
        </div>
      </div>
    </div>
  </div>
)