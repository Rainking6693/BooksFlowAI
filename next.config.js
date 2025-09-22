/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  
  // SECURITY: Enhanced security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Content-Security-Policy',
            value: (() => {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
              const scriptSrc = [
                "'self'",
                "'unsafe-eval'",
                "'unsafe-inline'",
              ].join(' ')

              const connectSrcParts = [
                "'self'",
                supabaseUrl,
                'https://api.openai.com',
                'https://api.mindee.net',
                'https://api.stripe.com',
                'https://checkout.stripe.com'
              ].filter(Boolean)

              const imgSrc = ["'self'", 'data:', 'https:'].join(' ')
              const fontSrc = ["'self'", 'data:'].join(' ')

              const directives = [
                `default-src 'self'`,
                `script-src ${scriptSrc}`,
                `style-src 'self' 'unsafe-inline'`,
                `img-src ${imgSrc}`,
                `font-src ${fontSrc}`,
                `connect-src ${connectSrcParts.join(' ')}`,
                `frame-ancestors 'none'`,
                // Allow Stripe Checkout if used
                `frame-src https://checkout.stripe.com`
              ]

              return directives.join('; ')
            })()
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  
  // Basic redirects
  async redirects() {
    return [
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
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Enable serverless functions for API routes
  // output: 'export', // Removed - incompatible with API routes
  // trailingSlash: true, // Removed - not needed for serverless
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
    domains: ['localhost', 'booksflowai.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Remove powered by header
  poweredByHeader: false,
  
  // Compression
  compress: true
}

module.exports = nextConfig
