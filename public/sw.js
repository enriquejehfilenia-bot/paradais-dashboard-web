// Service Worker que se auto-desregistra inmediatamente.
// Reemplaza al SW viejo del PWA y limpia todo su caché.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  // Borrar todos los cachés del SW viejo
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
  // Desregistrarse
  await self.registration.unregister()
  // Recargar todas las pestañas para que bajen el código nuevo
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(c => c.navigate(c.url))
})
