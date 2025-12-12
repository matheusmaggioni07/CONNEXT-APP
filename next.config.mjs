/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  
  poweredByHeader: false,
  
  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
      {
        // Prevent caching of sensitive API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/.env:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/.git:path*', 
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },

  async rewrites() {
    return {
      beforeFiles: [
        // Block source map files
        {
          source: '/:path*.map',
          destination: '/404',
        },
      ],
    }
  },

  async redirects() {
    return [
      // Block common attack paths
      {
        source: '/.env',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/.env.local',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/.git/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/wp-admin/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/phpmyadmin/:path*',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/admin/config/:path*',
        destination: '/404',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
