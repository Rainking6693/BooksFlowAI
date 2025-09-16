/**
 * Production-grade logging system
 * NO CONSOLE.LOG STATEMENTS ALLOWED IN PRODUCTION
 */

interface LogContext {
  userId?: string
  accountantId?: string
  transactionId?: string
  requestId?: string
  [key: string]: any
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: LogContext
  timestamp: string
  environment: string
}

class Logger {
  private environment: string
  private isDevelopment: boolean

  constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.isDevelopment = this.environment === 'development'
  }

  private formatLog(level: LogEntry['level'], message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: this.environment
    }
  }

  private writeLog(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Development: Pretty print to console
      const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : ''
      console.log(`[${entry.level.toUpperCase()}] ${entry.timestamp} | ${entry.message}${contextStr}`)
    } else {
      // Production: Structured JSON logging
      console.log(JSON.stringify(entry))
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.writeLog(this.formatLog('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    this.writeLog(this.formatLog('info', message, context))
  }

  warn(message: string, context?: LogContext): void {
    this.writeLog(this.formatLog('warn', message, context))
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }
    this.writeLog(this.formatLog('error', message, errorContext))
  }

  // Specialized logging methods for common use cases
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      type: 'api_request',
      method,
      url
    })
  }

  apiResponse(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`API Response: ${method} ${url} - ${statusCode} (${duration}ms)`, {
      ...context,
      type: 'api_response',
      method,
      url,
      statusCode,
      duration
    })
  }

  aiProcessing(operation: string, transactionCount: number, duration: number, context?: LogContext): void {
    this.info(`AI Processing: ${operation} - ${transactionCount} transactions (${duration}ms)`, {
      ...context,
      type: 'ai_processing',
      operation,
      transactionCount,
      duration
    })
  }

  databaseQuery(query: string, duration: number, context?: LogContext): void {
    this.debug(`Database Query: ${query} (${duration}ms)`, {
      ...context,
      type: 'database_query',
      query,
      duration
    })
  }

  userAction(action: string, userId: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, {
      ...context,
      type: 'user_action',
      action,
      userId
    })
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    this.warn(`Security Event: ${event} (${severity})`, {
      ...context,
      type: 'security_event',
      event,
      severity
    })
  }

  performanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    this.info(`Performance Metric: ${metric} = ${value}${unit}`, {
      ...context,
      type: 'performance_metric',
      metric,
      value,
      unit
    })
  }
}

// Singleton logger instance
export const logger = new Logger()

// Utility function for timing operations
export function withTiming<T>(operation: () => Promise<T>, operationName: string, context?: LogContext): Promise<T> {
  const startTime = Date.now()
  logger.debug(`Starting operation: ${operationName}`, context)
  
  return operation()
    .then(result => {
      const duration = Date.now() - startTime
      logger.performanceMetric(operationName, duration, 'ms', context)
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      logger.error(`Operation failed: ${operationName} (${duration}ms)`, error, context)
      throw error
    })
}

// Request ID middleware for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Error boundary logging
export function logUnhandledError(error: Error, context?: LogContext): void {
  logger.error('Unhandled error occurred', error, {
    ...context,
    type: 'unhandled_error'
  })
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
    
    // Keep only last 100 measurements
    const values = this.metrics.get(name)!
    if (values.length > 100) {
      values.shift()
    }
  }

  getAverageMetric(name: string): number | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null
    
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  getMetricPercentile(name: string, percentile: number): number | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index]
  }

  logMetricsSummary(): void {
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const avg = this.getAverageMetric(name)
        const p95 = this.getMetricPercentile(name, 95)
        const p99 = this.getMetricPercentile(name, 99)
        
        logger.info(`Performance Summary: ${name}`, {
          type: 'performance_summary',
          metric: name,
          average: avg,
          p95,
          p99,
          sampleCount: values.length
        })
      }
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()