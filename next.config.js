/** @type {import('next').NextConfig} */

// App-wide security headers. Pair with the per-response CSP applied by the
// preview proxy (`frame-ancestors 'self'`) so: (a) only our own origin can
// embed the preview iframe, and (b) our own pages can only embed frames
// served from our origin — blocks any accidental remote-iframe injection.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "frame-src 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
]

const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        // Apply to every route except the preview proxy (which sets its
        // own, tighter CSP per-response). `/api/preview/*` is excluded by
        // the negative lookahead below so we don't double-emit.
        source: '/:path((?!api/preview).*)',
        headers: securityHeaders,
      },
    ]
  },
  // Daytona SDK needs these polyfills in some environments
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

module.exports = nextConfig
