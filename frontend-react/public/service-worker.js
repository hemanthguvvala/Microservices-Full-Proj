/**
 * Service Worker for Progressive Web App (PWA)
 * Provides offline caching and background sync capabilities
 */

const CACHE_VERSION = 'v1'
const CACHE_NAME = `employee-management-${CACHE_VERSION}`

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html', // Fallback offline page
]

// API routes to cache (with network-first strategy)
const API_ROUTES = [
  '/api/employees',
  '/api/sagas',
  '/api/dashboard',
]

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  
  // Force waiting service worker to become active
  self.skipWaiting()
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('employee-management-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  
  // Take control of all pages immediately
  return self.clients.claim()
})

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return
  }
  
  // Strategy 1: Network-first for API calls
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(request))
    return
  }
  
  // Strategy 2: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }
  
  // Strategy 3: Stale-while-revalidate for HTML pages
  event.respondWith(staleWhileRevalidateStrategy(request))
})

/**
 * Network-first strategy
 * Try network first, fallback to cache if offline
 * Good for API calls that should be fresh
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request)
    
    if (cached) {
      console.log('[Service Worker] Serving from cache (offline):', request.url)
      return cached
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }
    
    throw error
  }
}

/**
 * Cache-first strategy
 * Check cache first, fallback to network
 * Good for static assets that rarely change
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request)
  
  if (cached) {
    return cached
  }
  
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error)
    throw error
  }
}

/**
 * Stale-while-revalidate strategy
 * Return cached version immediately, update cache in background
 * Good for content that should be fresh but can tolerate staleness
 */
async function staleWhileRevalidateStrategy(request) {
  const cached = await caches.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(CACHE_NAME)
      cache.then((c) => c.put(request, response.clone()))
    }
    return response
  })
  
  return cached || fetchPromise
}

/**
 * Check if request is for API
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || 
         API_ROUTES.some(route => url.pathname.startsWith(route))
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2']
  return assetExtensions.some(ext => url.pathname.endsWith(ext))
}

/**
 * Background sync for failed API requests
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-api-requests') {
    console.log('[Service Worker] Background sync triggered')
    event.waitUntil(syncApiRequests())
  }
})

/**
 * Sync pending API requests when back online
 */
async function syncApiRequests() {
  // Implement background sync logic
  // This would typically check IndexedDB for pending requests
  console.log('[Service Worker] Syncing pending requests...')
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received')
  
  const data = event.data?.json() || {}
  const title = data.title || 'Employee Management System'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.url,
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    )
  }
})

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[Service Worker] Cache cleared')
      })
    )
  }
})

console.log('[Service Worker] Loaded')
