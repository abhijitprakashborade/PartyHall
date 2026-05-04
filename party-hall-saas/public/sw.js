// PartyHub Service Worker - PWA offline support
// FIXED: Use Network-First for HTML, Cache-First only for static assets

const CACHE = 'partyhub-v3'
const STATIC_CACHE = 'partyhub-static-v3'
const OFFLINE_URL = '/offline'

// Only pre-cache truly static assets (not HTML pages which need fresh SSR)
const STATIC_ASSETS = [
    '/manifest.json',
    '/offline',
    '/favicon.ico',
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
    )
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE && k !== STATIC_CACHE)
                    .map(k => caches.delete(k))
            )
        )
    )
    self.clients.claim()
})

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return
    
    const url = new URL(event.request.url)

    // Only handle same-origin requests — never cache cross-origin (backend:8000, APIs, CDNs)
    if (url.origin !== self.location.origin) return

    // Never cache API calls
    if (url.pathname.startsWith('/api/')) return

    // Never cache Next.js HMR / webpack requests  
    if (url.pathname.startsWith('/_next/webpack-hmr')) return

    // For _next/static assets — Cache-First (they are content-hashed)
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.open(STATIC_CACHE).then(async (cache) => {
                const cached = await cache.match(event.request)
                if (cached) return cached
                const response = await fetch(event.request)
                if (response.ok) cache.put(event.request, response.clone())
                return response
            })
        )
        return
    }

    // For HTML/navigation requests — Network-First
    // This ensures SSR pages are always fresh, falling back to cache if offline
    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Don't cache if not a good response
                    if (!response.ok) return response
                    return response
                })
                .catch(() => caches.match(OFFLINE_URL))
        )
        return
    }

    // For everything else — Network-First with cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const clone = response.clone()
                    caches.open(CACHE).then((cache) => cache.put(event.request, clone))
                }
                return response
            })
            .catch(() => caches.match(event.request).then(c => c || caches.match(OFFLINE_URL)))
    )
})
