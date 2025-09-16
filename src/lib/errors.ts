/**
 * Production-grade error handling system
 * COMPREHENSIVE ERROR BOUNDARIES AND RECOVERY
 */

import { logger } from './logger'

// Base error class with structured error information
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>
  public readonly timestamp: string

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    this.timestamp = new Date().toISOString()

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }
}

// Specific error types for different domains
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404, true, context)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFLICT_ERROR', 409, true, context)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`${service} service error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, true, {
      service,
      ...context
    })
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`Database error: ${message}`, 'DATABASE_ERROR', 500, true, context)
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`AI service error: ${message}`, 'AI_SERVICE_ERROR', 500, true, context)
  }
}

export class QuickBooksError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`QuickBooks error: ${message}`, 'QUICKBOOKS_ERROR', 502, true, context)
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(`File upload error: ${message}`, 'FILE_UPLOAD_ERROR', 400, true, context)
  }
}

// Error handler utility functions
export function isAppError(error: any): error is AppError {
  return error instanceof AppError
}

export function isOperationalError(error: any): boolean {
  if (isAppError(error)) {
    return error.isOperational
  }
  return false
}

// Error logging and reporting
export function logError(error: Error, context?: Record<string, any>): void {
  if (isAppError(error)) {
    logger.error(error.message, error, {
      ...context,
      ...error.context,
      errorCode: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    })
  } else {
    logger.error('Unexpected error occurred', error, context)
  }
}

// Error response formatting for APIs
export function formatErrorResponse(error: Error) {
  if (isAppError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          context: error.context
        })
      }
    }
  }

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      ...(isDevelopment && {
        stack: error.stack
      })
    }
  }
}

// Async error wrapper for better error handling
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(error as Error, { function: fn.name, arguments: args })
      throw error
    }
  }
}

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  context?: Record<string, any>
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts) {
        logger.error(`Operation failed after ${maxAttempts} attempts`, lastError, {
          ...context,
          attempts: maxAttempts
        })
        throw lastError
      }

      // Don't retry on certain error types
      if (isAppError(lastError) && 
          [ValidationError, AuthenticationError, AuthorizationError, NotFoundError].some(
            ErrorClass => lastError instanceof ErrorClass
          )) {
        throw lastError
      }

      const delay = baseDelay * Math.pow(2, attempt - 1)
      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
        ...context,
        attempt,
        delay,
        error: lastError.message
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly name: string = 'CircuitBreaker'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`)
      } else {
        throw new ExternalServiceError(
          this.name,
          'Circuit breaker is OPEN - service temporarily unavailable'
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
      logger.info(`Circuit breaker ${this.name} recovered - state: CLOSED`)
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
      logger.warn(`Circuit breaker ${this.name} opened due to ${this.failures} failures`)
    }
  }

  getState(): string {
    return this.state
  }

  getFailureCount(): number {
    return this.failures
  }
}

// Global error handlers
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', reason, {
      type: 'unhandled_rejection',
      promise: promise.toString()
    })
    
    // In production, we might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, {
      type: 'uncaught_exception'
    })
    
    // Always exit on uncaught exceptions
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully')
    process.exit(0)
  })

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully')
    process.exit(0)
  })
}

// Error boundary for React components
export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

export function createErrorBoundary(fallbackComponent: React.ComponentType<{ error: Error }>) {
  return class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{}>,
    ErrorBoundaryState
  > {
    constructor(props: React.PropsWithChildren<{}>) {
      super(props)
      this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: any) {
      logError(error, {
        type: 'react_error_boundary',
        componentStack: errorInfo.componentStack
      })
      
      this.setState({ errorInfo })
    }

    render() {
      if (this.state.hasError && this.state.error) {
        return React.createElement(fallbackComponent, { error: this.state.error })
      }

      return this.props.children
    }
  }
}