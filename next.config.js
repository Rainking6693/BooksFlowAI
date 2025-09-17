/** @type {import('next').NextConfig} */

const nextConfig = {
  // Enable React strict mode for better error detection
  reactStrictMode: true,
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['localhost', 'booksflowai.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
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
  
  // Output configuration for Vercel
  output: 'standalone',
  
  // Remove powered by header
  poweredByHeader: false,
  
  // Compression
  compress: true
}

module.exports = nextConfig
