import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ValidationError, DatabaseError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

// Performance monitoring endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1h'
    const metric = searchParams.get('metric') || 'all'
    const endpoint = searchParams.get('endpoint')

    const performanceData = await getPerformanceMetrics(timeRange, metric, endpoint)

    return NextResponse.json({
      success: true,
      data: performanceData,
      metadata: {
        timeRange,
        metric,
        endpoint,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error('Performance monitoring API error', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

// Record performance metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      endpoint,
      method,
      responseTime,
      statusCode,
      userAgent,
      userId,
      timestamp
    } = body

    // Validate required fields
    if (!endpoint || !method || responseTime === undefined || !statusCode) {
      throw new ValidationError('Missing required performance metric fields')
    }

    // Record performance metric
    const metricId = await recordPerformanceMetric({
      endpoint,
      method,
      responseTime,
      statusCode,
      userAgent,
      userId,
      timestamp: timestamp || new Date().toISOString()
    })

    // Check for performance alerts
    await checkPerformanceAlerts({
      endpoint,
      responseTime,
      statusCode
    })

    logger.info('Performance metric recorded', {
      metricId,
      endpoint,
      responseTime,
      statusCode
    })

    return NextResponse.json({
      success: true,
      metricId,
      recorded_at: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error('Performance metric validation error', error)
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    logger.error('Performance metric recording error', error as Error)
    return NextResponse.json(
      { error: 'Failed to record performance metric' },
      { status: 500 }
    )
  }
}

/**
 * Get performance metrics from database
 */
async function getPerformanceMetrics(
  timeRange: string,
  metric: string,
  endpoint?: string | null
) {
  const timeRangeMap: Record<string, string> = {
    '1h': '1 hour',
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days'
  }

  const interval = timeRangeMap[timeRange] || '1 hour'
  const startTime = new Date(Date.now() - getTimeRangeMs(timeRange))

  let query = supabase
    .from('performance_metrics')
    .select('*')
    .gte('timestamp', startTime.toISOString())
    .order('timestamp', { ascending: false })

  if (endpoint) {
    query = query.eq('endpoint', endpoint)
  }

  const { data: metrics, error } = await query

  if (error) {
    throw new DatabaseError('Failed to fetch performance metrics', {
      dbError: error.message,
      timeRange,
      metric,
      endpoint
    })
  }

  // Calculate aggregated metrics
  const aggregatedMetrics = calculateAggregatedMetrics(metrics || [])
  
  // Get endpoint breakdown
  const endpointBreakdown = getEndpointBreakdown(metrics || [])
  
  // Get performance trends
  const trends = calculatePerformanceTrends(metrics || [], timeRange)
  
  // Get current system status
  const systemStatus = await getCurrentSystemStatus()

  return {
    summary: aggregatedMetrics,
    endpoints: endpointBreakdown,
    trends,
    systemStatus,
    rawMetrics: metric === 'raw' ? metrics : undefined
  }
}

/**
 * Record a performance metric
 */
async function recordPerformanceMetric(params: {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  userAgent?: string
  userId?: string
  timestamp: string
}): Promise<string> {
  const {
    endpoint,
    method,
    responseTime,
    statusCode,
    userAgent,
    userId,
    timestamp
  } = params

  // Determine performance category
  const category = categorizePerformance(responseTime)
  
  // Calculate performance score
  const score = calculatePerformanceScore(responseTime, statusCode)

  const { data, error } = await supabase
    .from('performance_metrics')
    .insert({
      endpoint,
      method,
      response_time_ms: responseTime,
      status_code: statusCode,
      performance_category: category,
      performance_score: score,
      user_agent: userAgent,
      user_id: userId,
      timestamp,
      metadata: {
        recorded_by: 'api',
        version: process.env.APP_VERSION || '1.0.0'
      }
    })
    .select('id')
    .single()

  if (error) {
    throw new DatabaseError('Failed to record performance metric', {
      dbError: error.message,
      endpoint,
      responseTime,
      statusCode
    })
  }

  return data.id
}

/**
 * Check for performance alerts
 */
async function checkPerformanceAlerts(params: {
  endpoint: string
  responseTime: number
  statusCode: number
}) {
  const { endpoint, responseTime, statusCode } = params
  const alerts = []

  // Slow response alert
  if (responseTime > 2000) {
    alerts.push({
      type: 'slow_response',
      severity: responseTime > 5000 ? 'critical' : 'warning',
      message: `Slow response detected: ${endpoint} took ${responseTime}ms`,
      threshold: 2000,
      actual: responseTime
    })
  }

  // Error status alert
  if (statusCode >= 500) {
    alerts.push({
      type: 'server_error',
      severity: 'critical',
      message: `Server error detected: ${endpoint} returned ${statusCode}`,
      statusCode
    })
  } else if (statusCode >= 400) {
    alerts.push({
      type: 'client_error',
      severity: 'warning',
      message: `Client error detected: ${endpoint} returned ${statusCode}`,
      statusCode
    })
  }

  // Send alerts if any
  for (const alert of alerts) {
    await sendPerformanceAlert(alert)
  }
}

/**
 * Send performance alert
 */
async function sendPerformanceAlert(alert: any) {
  try {
    // Record alert in database
    await supabase
      .from('performance_alerts')
      .insert({
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message,
        metadata: alert,
        created_at: new Date().toISOString()
      })

    // Send to external monitoring service if configured
    if (process.env.MONITORING_WEBHOOK_URL) {
      await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'booksflowai-api'
        })
      })
    }

    logger.warn('Performance alert sent', alert)

  } catch (error) {
    logger.error('Failed to send performance alert', error as Error)
  }
}

/**
 * Calculate aggregated metrics
 */
function calculateAggregatedMetrics(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      successRate: 100
    }
  }

  const responseTimes = metrics.map(m => m.response_time_ms).sort((a, b) => a - b)
  const errorCount = metrics.filter(m => m.status_code >= 400).length
  
  const p95Index = Math.floor(responseTimes.length * 0.95)
  const p99Index = Math.floor(responseTimes.length * 0.99)

  return {
    totalRequests: metrics.length,
    averageResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
    p95ResponseTime: responseTimes[p95Index] || 0,
    p99ResponseTime: responseTimes[p99Index] || 0,
    errorRate: Math.round((errorCount / metrics.length) * 100 * 100) / 100,
    successRate: Math.round(((metrics.length - errorCount) / metrics.length) * 100 * 100) / 100
  }
}

/**
 * Get endpoint breakdown
 */
function getEndpointBreakdown(metrics: any[]) {
  const endpointMap = new Map()

  metrics.forEach(metric => {
    const key = `${metric.method} ${metric.endpoint}`
    if (!endpointMap.has(key)) {
      endpointMap.set(key, {
        endpoint: metric.endpoint,
        method: metric.method,
        requests: 0,
        totalResponseTime: 0,
        errors: 0
      })
    }

    const data = endpointMap.get(key)
    data.requests++
    data.totalResponseTime += metric.response_time_ms
    if (metric.status_code >= 400) {
      data.errors++
    }
  })

  return Array.from(endpointMap.values()).map(data => ({
    ...data,
    averageResponseTime: Math.round(data.totalResponseTime / data.requests),
    errorRate: Math.round((data.errors / data.requests) * 100 * 100) / 100
  })).sort((a, b) => b.requests - a.requests)
}

/**
 * Calculate performance trends
 */
function calculatePerformanceTrends(metrics: any[], timeRange: string) {
  const bucketSize = getBucketSize(timeRange)
  const buckets = new Map()

  metrics.forEach(metric => {
    const bucketKey = Math.floor(new Date(metric.timestamp).getTime() / bucketSize) * bucketSize
    
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        timestamp: new Date(bucketKey).toISOString(),
        requests: 0,
        totalResponseTime: 0,
        errors: 0
      })
    }

    const bucket = buckets.get(bucketKey)
    bucket.requests++
    bucket.totalResponseTime += metric.response_time_ms
    if (metric.status_code >= 400) {
      bucket.errors++
    }
  })

  return Array.from(buckets.values())
    .map(bucket => ({
      ...bucket,
      averageResponseTime: bucket.requests > 0 ? Math.round(bucket.totalResponseTime / bucket.requests) : 0,
      errorRate: bucket.requests > 0 ? Math.round((bucket.errors / bucket.requests) * 100 * 100) / 100 : 0
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

/**
 * Get current system status
 */
async function getCurrentSystemStatus() {
  // Get recent metrics (last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  const { data: recentMetrics } = await supabase
    .from('performance_metrics')
    .select('response_time_ms, status_code')
    .gte('timestamp', fiveMinutesAgo.toISOString())

  if (!recentMetrics || recentMetrics.length === 0) {
    return {
      status: 'unknown',
      message: 'No recent metrics available'
    }
  }

  const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.response_time_ms, 0) / recentMetrics.length
  const errorRate = recentMetrics.filter(m => m.status_code >= 400).length / recentMetrics.length * 100

  let status = 'healthy'
  let message = 'All systems operational'

  if (avgResponseTime > 2000 || errorRate > 5) {
    status = 'degraded'
    message = 'Performance degradation detected'
  }

  if (avgResponseTime > 5000 || errorRate > 10) {
    status = 'unhealthy'
    message = 'System performance issues detected'
  }

  return {
    status,
    message,
    metrics: {
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests: recentMetrics.length
    }
  }
}

/**
 * Helper functions
 */
function getTimeRangeMs(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }
  return ranges[timeRange] || ranges['1h']
}

function getBucketSize(timeRange: string): number {
  const buckets: Record<string, number> = {
    '1h': 5 * 60 * 1000,      // 5 minutes
    '24h': 60 * 60 * 1000,    // 1 hour
    '7d': 6 * 60 * 60 * 1000, // 6 hours
    '30d': 24 * 60 * 60 * 1000 // 1 day
  }
  return buckets[timeRange] || buckets['1h']
}

function categorizePerformance(responseTime: number): string {
  if (responseTime < 200) return 'excellent'
  if (responseTime < 500) return 'good'
  if (responseTime < 1000) return 'acceptable'
  if (responseTime < 2000) return 'slow'
  return 'critical'
}

function calculatePerformanceScore(responseTime: number, statusCode: number): number {
  let score = 100
  
  // Deduct points for slow response
  if (responseTime > 200) score -= Math.min(50, (responseTime - 200) / 100)
  
  // Deduct points for errors
  if (statusCode >= 400) score -= 30
  if (statusCode >= 500) score -= 50
  
  return Math.max(0, Math.round(score))
}