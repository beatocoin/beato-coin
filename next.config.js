/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // output: 'standalone', // Disabled due to Windows symlink issues
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
      'pg-native': false,
      'trim': false,
      'pg': false,
      'pg-format': false,
      'react-native': false
    }
    
    // Add alias for submodule imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // When @/ is used in files from the submodule, resolve to the submodule's src directory
      '@/components': path.resolve('./nextjs-template/src/components'),
      '@/utils': path.resolve('./nextjs-template/src/utils'),
      '@/contexts': path.resolve('./nextjs-template/src/contexts'),
      '@/lib': path.resolve('./nextjs-template/src/lib'),
      '@/app': path.resolve('./nextjs-template/src/app'),
      '@/hooks': path.resolve('./nextjs-template/src/hooks'),
      // Add alias for @submodule imports
      '@submodule/components': path.resolve('./nextjs-template/src/components'),
      '@submodule/utils': path.resolve('./nextjs-template/src/utils'),
      '@submodule/contexts': path.resolve('./nextjs-template/src/contexts'),
      '@submodule/lib': path.resolve('./nextjs-template/src/lib'),
      '@submodule/app': path.resolve('./nextjs-template/src/app'),
      '@submodule/hooks': path.resolve('./nextjs-template/src/hooks'),
      '@submodule/middleware': path.resolve('./nextjs-template/src/middleware'),
      '@submodule': path.resolve('./nextjs-template/src'),
      
      // Add alias for main application
      '@app/components': path.resolve('./src/components'),
      '@app/utils': path.resolve('./src/utils'),
      '@app/contexts': path.resolve('./src/contexts'),
      '@app/lib': path.resolve('./src/lib'),
      '@app/app': path.resolve('./src/app'),
      '@app/hooks': path.resolve('./src/hooks'),
      '@app/config': path.resolve('./src/config'),
      '@app': path.resolve('./src')
    };
    
    // Optimize watchOptions for development
    if (process.env.NODE_ENV === 'development') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**']
      }
    }
    
    // Add externals required for AppKit
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    return config
  }
}

module.exports = nextConfig