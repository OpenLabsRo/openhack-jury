const CACHE = 'app-v2'
const PRECACHE = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // Never cache requests to api.openhack.ro
  if (url.hostname === 'api.openhack.ro' || url.hostname === 'localhost') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return new Response('Offline - API not available', {
          status: 503,
          statusText: 'Service Unavailable',
        })
      })
    )
    return
  }

  // Cache strategy for all other requests (app assets, etc.)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          const resClone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, resClone))
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})
