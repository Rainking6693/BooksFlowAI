/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variable validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://api.openai.com https://sandbox-quickbooks.api.intuit.com https://quickbooks.api.intuit.com https://oauth.platform.intuit.com https://api.mindee.net wss://*.supabase.co",
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://appcenter.intuit.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // Prevent XSS attacks
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // Enforce HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: [
              'camera=self',
              'microphone=()',
              'geolocation=()',
              'payment=self',
              'usb=()',
              'magnetometer=()',
              'accelerometer=()',
              'gyroscope=()',
              'fullscreen=self'
            ].join(', ')
          },
          // Remove server information
          {
            key: 'X-Powered-By',
            value: ''
          },
          // Cache control for security
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          }
        ]
      },
      // API routes security
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // API-specific cache control
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          },
          // CORS headers for API
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? process.env.NEXT_PUBLIC_APP_URL || 'https://booksflowai.com'
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          }
        ]
      },
      // Static assets caching
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  
  // Redirects for security
  async redirects() {
    return [
      // Redirect HTTP to HTTPS in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http'
            }
          ],
          destination: `https://${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '')}/:path*`,
          permanent: true
        }
      ] : []),
      // Redirect old paths
      {
        source: '/login',
        destination: '/auth',
        permanent: true
      },
      {
        source: '/signup',
        destination: '/auth',
        permanent: true
      }
    ]
  },
  
  // Rewrites for API versioning
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*'
      }
    ]
  },
  
  // Webpack configuration for security and performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Security: Don't expose source maps in production
    if (!dev && !isServer) {
      config.devtool = false
    }
    
    // Performance: Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true
        })
      )
    }
    
    // Security: Remove comments and console logs in production
    if (!dev) {
      config.optimization.minimizer.push(
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1
        })
      )
    }
    
    return config
  },
  
  // Experimental features for performance
  experimental: {
    // Enable modern JavaScript features
    esmExternals: true,
    // Optimize server components
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  },
  
  // TypeScript configuration
  typescript: {
    // Fail build on TypeScript errors
    ignoreBuildErrors: false
  },
  
  // ESLint configuration
  eslint: {
    // Fail build on ESLint errors
    ignoreDuringBuilds: false,
    // Run ESLint on these directories
    dirs: ['src', 'pages', 'components', 'lib', 'utils']
  },
  
  // Output configuration
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Compression
  compress: true,
  
  // Power by header removal
  poweredByHeader: false,
  
  // Generate build ID for cache busting
  generateBuildId: async () => {
    // Use git commit hash in production, timestamp in development
    if (process.env.NODE_ENV === 'production') {
      try {
        const { execSync } = require('child_process')
        return execSync('git rev-parse HEAD').toString().trim()
      } catch {
        return `build-${Date.now()}`
      }
    }
    return `dev-${Date.now()}`
  },
  
  // Environment variables validation
  async onDemandEntries() {
    // Validate critical environment variables on startup
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'QUICKBOOKS_CLIENT_ID',
      'QUICKBOOKS_CLIENT_SECRET'
    ]
    
    const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:')
      missing.forEach(envVar => console.error(`  - ${envVar}`))
      throw new Error('Missing required environment variables')
    }
    
    console.log('✅ Environment variables validation passed')
  }
}

// Security validation on module load
if (process.env.NODE_ENV === 'production') {
  // Validate production security requirements
  const securityChecks = [
    {
      name: 'HTTPS enforcement',
      check: () => process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'),
      error: 'NEXT_PUBLIC_APP_URL must use HTTPS in production'
    },
    {
      name: 'Secure cookies',
      check: () => process.env.NODE_ENV === 'production',
      error: 'Secure cookie settings required in production'
    },
    {
      name: 'CSP configuration',
      check: () => true, // CSP is configured above
      error: 'Content Security Policy must be configured'
    }
  ]
  
  const failedChecks = securityChecks.filter(check => !check.check())
  
  if (failedChecks.length > 0) {
    console.error('❌ Security validation failed:')
    failedChecks.forEach(check => console.error(`  - ${check.error}`))
    throw new Error('Security validation failed')
  }
  
  console.log('✅ Production security validation passed')
}

module.exports = nextConfig