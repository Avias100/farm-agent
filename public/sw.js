// Service Worker for Nebula Farm Manager
const CACHE_NAME = 'nebula-farm-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png'
]

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response before caching
        const responseToCache = response.clone()
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, responseToCache))
        return response
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
      })
  )
})
