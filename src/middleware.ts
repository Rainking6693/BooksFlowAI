/**
 * Production-grade Next.js Middleware
 * SECURITY ENFORCEMENT - RATE LIMITING - REQUEST VALIDATION
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Security configuration
const SECURITY_CONFIG = {
  RATE_LIMITS: {
    API: { requests: 100, window: 60000 }, // 100 requests per minute
    AUTH: { requests: 5, window: 300000 }, // 5 requests per 5 minutes
    UPLOAD: { requests: 10, window: 60000 }, // 10 uploads per minute
  },
  BLOCKED_IPS: new Set<string>(),
  SUSPICIOUS_PATTERNS: [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
  ],
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
}

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname, search } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  const ip = getClientIP(request)
  const method = request.method

  // Generate request ID for tracing
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  // Log incoming request
  logger.apiRequest(method, pathname + search, {
    requestId,
    ip,
    userAgent: userAgent.substring(0, 100), // Truncate for logging
    timestamp: new Date().toISOString()
  })

  try {
    // Security checks
    const securityCheck = performSecurityChecks(request, ip, pathname)
    if (securityCheck) {
      return securityCheck
    }

    // Rate limiting
    const rateLimitCheck = performRateLimit(request, ip, pathname)
    if (rateLimitCheck) {
      return rateLimitCheck
    }

    // Request validation
    const validationCheck = performRequestValidation(request, pathname)
    if (validationCheck) {
      return validationCheck
    }

    // Authentication checks for protected routes
    const authCheck = performAuthenticationCheck(request, pathname)
    if (authCheck) {
      return authCheck
    }

    // Create response with security headers
    const response = NextResponse.next()
    
    // Add security headers
    addSecurityHeaders(response, requestId)
    
    // Add request ID for tracing
    response.headers.set('X-Request-ID', requestId)
    
    // Log successful request processing
    const duration = Date.now() - startTime
    logger.apiResponse(method, pathname, 200, duration, {
      requestId,
      ip
    })

    return response

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('Middleware error', error as Error, {
      requestId,
      ip,
      pathname,
      method,
      duration
    })

    // Return generic error response
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'Content-Type': 'application/json'
      }
    })
  }
}

/**
 * Perform comprehensive security checks
 */
function performSecurityChecks(request: NextRequest, ip: string, pathname: string): NextResponse | null {
  // Check blocked IPs
  if (SECURITY_CONFIG.BLOCKED_IPS.has(ip)) {
    logger.securityEvent('blocked_ip_access', 'high', {
      ip,
      pathname,
      reason: 'IP in blocklist'
    })
    
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Check for suspicious patterns in URL
  const fullUrl = pathname + request.nextUrl.search
  for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
    if (pattern.test(fullUrl)) {
      logger.securityEvent('suspicious_pattern_detected', 'high', {
        ip,
        pathname,
        pattern: pattern.toString(),
        fullUrl
      })
      
      return new NextResponse('Bad Request', { status: 400 })
    }
  }

  // Check request size for POST/PUT requests
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
    logger.securityEvent('request_too_large', 'medium', {
      ip,
      pathname,
      contentLength: parseInt(contentLength),
      maxSize: SECURITY_CONFIG.MAX_REQUEST_SIZE
    })
    
    return new NextResponse('Request Entity Too Large', { status: 413 })
  }

  // Check for common attack headers
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ]
  
  for (const header of suspiciousHeaders) {
    if (request.headers.get(header)) {
      logger.securityEvent('suspicious_header_detected', 'medium', {
        ip,
        pathname,
        header,
        value: request.headers.get(header)
      })
    }
  }

  return null
}

/**
 * Perform rate limiting based on IP and endpoint
 */
function performRateLimit(request: NextRequest, ip: string, pathname: string): NextResponse | null {
  const now = Date.now()
  
  // Clean up expired entries opportunistically
  if (Math.random() < 0.1) { // 10% chance to cleanup on each request
    cleanupExpiredEntries()
  }
  
  // Determine rate limit based on endpoint
  let rateLimit = SECURITY_CONFIG.RATE_LIMITS.API
  
  if (pathname.startsWith('/api/auth/')) {
    rateLimit = SECURITY_CONFIG.RATE_LIMITS.AUTH
  } else if (pathname.includes('/upload')) {
    rateLimit = SECURITY_CONFIG.RATE_LIMITS.UPLOAD
  }

  const key = `${ip}:${pathname.split('/')[1] || 'root'}`
  const current = rateLimitStore.get(key)

  if (current) {
    if (now < current.resetTime) {
      if (current.count >= rateLimit.requests) {
        logger.securityEvent('rate_limit_exceeded', 'medium', {
          ip,
          pathname,
          currentCount: current.count,
          limit: rateLimit.requests,
          resetTime: new Date(current.resetTime).toISOString()
        })

        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': rateLimit.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          }
        })
      }
      
      current.count++
    } else {
      // Reset window
      rateLimitStore.set(key, { count: 1, resetTime: now + rateLimit.window })
    }
  } else {
    // First request
    rateLimitStore.set(key, { count: 1, resetTime: now + rateLimit.window })
  }

  return null
}

/**
 * Perform request validation
 */
function performRequestValidation(request: NextRequest, pathname: string): NextResponse | null {
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type')
    
    if (pathname.startsWith('/api/') && contentType) {
      const validContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ]
      
      const isValidContentType = validContentTypes.some(type => 
        contentType.toLowerCase().includes(type)
      )
      
      if (!isValidContentType) {
        logger.securityEvent('invalid_content_type', 'low', {
          pathname,
          contentType,
          method: request.method
        })
        
        return new NextResponse('Unsupported Media Type', { status: 415 })
      }
    }
  }

  // Validate required headers for API requests
  if (pathname.startsWith('/api/') && request.method !== 'GET') {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    // CSRF protection: require origin or referer for state-changing requests
    if (!origin && !referer) {
      logger.securityEvent('missing_csrf_headers', 'medium', {
        pathname,
        method: request.method
      })
      
      return new NextResponse('Bad Request', { status: 400 })
    }
  }

  return null
}

/**
 * Perform authentication checks for protected routes
 */
function performAuthenticationCheck(request: NextRequest, pathname: string): NextResponse | null {
  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/api/ai/',
    '/api/quickbooks/',
    '/api/clients/',
    '/api/reports/'
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    // Check for authentication token
    const authHeader = request.headers.get('authorization')
    const sessionCookie = request.cookies.get('sb-access-token')
    
    if (!authHeader && !sessionCookie) {
      logger.securityEvent('unauthorized_access_attempt', 'medium', {
        pathname,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent')
      })
      
      // Redirect to auth page for dashboard routes
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/auth', request.url))
      }
      
      // Return 401 for API routes
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  return null
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, requestId: string): void {
  // Security headers (additional to those in next.config.js)
  response.headers.set('X-Request-ID', requestId)
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Remove potentially sensitive headers
  response.headers.delete('server')
  response.headers.delete('x-powered-by')
}

/**
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  
  return request.ip || 'unknown'
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}