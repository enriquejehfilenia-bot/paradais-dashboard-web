/** @type {import('next').NextConfig} */
// Nota: CORS dinámico manejado en middleware.ts (soporta múltiples orígenes correctamente)

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
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
