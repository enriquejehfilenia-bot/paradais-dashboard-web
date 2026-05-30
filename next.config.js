/** @type {import('next').NextConfig} */
const ALLOWED_ORIGINS = [
  'https://paradaisddb-ventas-medios.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8000',
  'http://localhost:8765',
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      // CORS — solo rutas de API
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',      value: ALLOWED_ORIGINS.join(', ') },
          { key: 'Access-Control-Allow-Methods',     value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers',     value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      // Headers de seguridad — todas las rutas
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection',      value: '1; mode=block' },
          { key: 'Cache-Control',         value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
