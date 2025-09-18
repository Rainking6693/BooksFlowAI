/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  
  // Essential security headers (simplified)
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
