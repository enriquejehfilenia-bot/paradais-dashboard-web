import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Paradais DDB · Dashboard',
  description: 'Dashboard Ejecutivo · Paradais DDB',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Paradais DDB' },
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
        {/* Desregistrar Service Workers viejos automáticamente */}
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
