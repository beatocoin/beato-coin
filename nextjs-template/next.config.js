/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  typescript: {
    // Only ignore build errors in production
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Only ignore during builds in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: [
      'files.stripe.com',
      'stripe.com',
      'b.stripecdn.com',
      'www.onlyfams.ai',
      'onlyfams.ai'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'files.stripe.com',
      },
      {
        protocol: 'https',
        hostname: 'stripe.com',
      },
      {
        protocol: 'https',
        hostname: 'b.stripecdn.com',
      },
      {
        protocol: 'https',
        hostname: 'www.onlyfams.ai',
      },
      {
        protocol: 'https',
        hostname: 'onlyfams.ai',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "encoding": false,
      "node-fetch": false,
      "@supabase/node-fetch": false
    }
    // Optimize watchOptions for development
    if (process.env.NODE_ENV === 'development') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**']
      }
    }
    return config
  }
}

module.exports = nextConfig