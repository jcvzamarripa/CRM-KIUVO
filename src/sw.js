// KIUVO CRM — Service Worker
// self.__WB_MANIFEST es inyectado por vite-plugin-pwa al compilar:
// contiene la lista de todos los JS/CSS/assets generados por Vite con sus hashes.
const MANIFEST = self.__WB_MANIFEST || []
const CACHE_NAME = 'kiuvo-v2'

const SHELL = [
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

// ── Install: precachear shell + TODOS los assets de Vite ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...SHELL, ...MANIFEST.map(({ url }) => url)]))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: limpiar caches de versiones anteriores ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Supabase → siempre network, sin cachear datos de negocio
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response('{"offline":true}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Navegación SPA → servir index.html desde cache (funciona offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch(request))
    )
    return
  }

  // Assets estáticos → cache-first, lazy-cache si no está aún
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone))
        }
        return response
      }).catch(() => new Response('', { status: 503 }))
    })
  )
})
