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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vrkwvtwfngeushjzazak.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://vrkwvtwfngeushjzazak.supabase.co https://api.openai.com; frame-ancestors 'none';"
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
