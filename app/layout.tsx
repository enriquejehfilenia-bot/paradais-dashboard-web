import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Paradais TBWA · Dashboard',
  description: 'Dashboard Ejecutivo · Paradais TBWA',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Paradais TBWA' },
}

export const viewport: Viewport = {
  width:            'device-width',
  initialScale:     1,
  maximumScale:     1,
  themeColor:       '#EAB308',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Desregistrar Service Workers viejos automáticamente — sin SW activo,
            el navegador respeta el caché normal de Next.js (headers correctos
            por archivo) en vez de la caché manual de un SW que puede quedar
            vieja. Evita tener que acordarse de subir versión en cada deploy. */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              regs.forEach(function(r) { r.unregister(); });
            });
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
