/**
 * MyEasyTill Service Worker  — offline-first for cashier
 *
 * Strategy:
 *  • Navigation (HTML pages)  → cache-first, revalidate in background
 *  • Next.js static chunks    → cache-first (immutable hashed filenames)
 *  • GET /api/admin/products  → network-first, IndexedDB fallback
 *  • GET /api/admin/categories→ network-first, IndexedDB fallback
 *  • GET /api/shifts/active   → network-first, IndexedDB fallback
 *  • POST /api/shifts/start   → network-first (page handles offline locally)
 *  • POST /api/orders         → network-first (page handles offline locally)
 *  • Everything else          → network-first, cache fallback
 */

const CACHE_VERSION = 'myeasytill-v1'
const OFFLINE_DB    = 'myeasytill-offline'

// Pages we cache on install + revalidate on every visit
const PRECACHE_URLS = [
  '/login',
  '/cashier/pos',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/logo.png',
]

// ─── IndexedDB helpers (duplicated so SW doesn't need ES-module import) ───────

function swOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, 2)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      const stores = ['credentials','session','products','categories','shift','orders_queue']
      stores.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          if (name === 'orders_queue') db.createObjectStore(name, { keyPath: 'localId', autoIncrement: true })
          else if (name === 'products' || name === 'categories') db.createObjectStore(name, { keyPath: '_id' })
          else if (name === 'shift') db.createObjectStore(name, { keyPath: 'id' })
          else if (name === 'credentials') db.createObjectStore(name, { keyPath: 'email' })
          else db.createObjectStore(name, { keyPath: 'key' })
        }
      })
    }
    req.onsuccess  = () => resolve(req.result)
    req.onerror    = () => reject(req.error)
  })
}

async function swDbGetAll(store) {
  const db = await swOpenDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => res(req.result ?? [])
    req.onerror   = () => rej(req.error)
  })
}

async function swDbGet(store, key) {
  const db = await swOpenDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => res(req.result ?? null)
    req.onerror   = () => rej(req.error)
  })
}

async function swDbPutAll(store, items) {
  const db = await swOpenDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    const s  = tx.objectStore(store)
    s.clear()
    items.forEach(item => s.put(item))
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// ─── JSON response helper ─────────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Offline': '1' },
  })
}

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Precache assets one-by-one so a single 404 doesn't abort the install
      for (const url of PRECACHE_URLS) {
        try { await cache.add(url) } catch (_) { /* page may not exist yet */ }
      }
    })
  )
  self.skipWaiting()
})

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url         = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // ── 1. Next.js static chunks — cache-first (immutable) ──────────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // ── 2. Static icons / logo ───────────────────────────────────────────────────
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request))
    return
  }

  // ── 3. API routes ─────────────────────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request, url))
    return
  }

  // ── 4. Navigation (HTML pages) — cache-first, background revalidate ──────────
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
    return
  }

  // ── 5. Everything else — network-first ───────────────────────────────────────
  event.respondWith(networkFirst(request))
})

// ─── API handler ─────────────────────────────────────────────────────────────
async function handleApiRequest(request, url) {
  const method = request.method.toUpperCase()

  // Products — network-first, cache + IndexedDB fallback
  if (url.pathname === '/api/admin/products' && method === 'GET') {
    return networkFirstWithIndexedDB(
      request,
      async (data) => { if (data?.success && data.products) await swDbPutAll('products', data.products) },
      async () => {
        const products = await swDbGetAll('products')
        return jsonResponse({ success: true, products, offline: true })
      }
    )
  }

  // Categories — network-first, cache + IndexedDB fallback
  if (url.pathname === '/api/admin/categories' && method === 'GET') {
    return networkFirstWithIndexedDB(
      request,
      async (data) => { if (data?.success && data.categories) await swDbPutAll('categories', data.categories) },
      async () => {
        const categories = await swDbGetAll('categories')
        return jsonResponse({ success: true, categories, offline: true })
      }
    )
  }

  // Active shift — network-first, IndexedDB fallback
  if (url.pathname === '/api/shifts/active' && method === 'GET') {
    return networkFirstWithIndexedDB(
      request,
      async (data) => {
        if (data?.shift) {
          try {
            const db = await swOpenDB()
            const tx = db.transaction('shift', 'readwrite')
            tx.objectStore('shift').put({ ...data.shift, id: 'active' })
          } catch (_) {}
        }
      },
      async () => {
        const session = await swDbGet('session', 'current')
        const shiftRow = await swDbGet('shift', 'active')
        const shift    = shiftRow ? (({ id: _, ...s }) => s)(shiftRow) : null
        return jsonResponse({
          success:           true,
          shift,
          cashierName:       session?.name || '',
          currentCashBalance: shift?.openingCash || 0,
          offline:           true,
        })
      }
    )
  }

  // Admin shifts list — network-first, IndexedDB fallback (active shift only)
  if (url.pathname === '/api/admin/shifts' && method === 'GET') {
    try {
      const networkRes = await fetch(request)
      if (networkRes.ok) return networkRes
      throw new Error('non-ok')
    } catch (_) {
      const shiftRow = await swDbGet('shift', 'active')
      if (!shiftRow) return jsonResponse({ success: true, shifts: [] })
      const { id: _key, ...shift } = shiftRow
      const session  = await swDbGet('session', 'current')
      const cashier  = session
        ? { _id: session.id, name: session.name, email: session.email }
        : (shift.cashier && typeof shift.cashier === 'object' ? shift.cashier : { name: shift.cashierName || '—' })
      return jsonResponse({ success: true, shifts: [{ ...shift, cashier }], offline: true })
    }
  }

  // Single shift (Z-Report) — network-first, IndexedDB fallback
  if (url.pathname.match(/^\/api\/admin\/shifts\/[^/]+$/) && method === 'GET') {
    try {
      const networkRes = await fetch(request)
      if (networkRes.ok) return networkRes
      throw new Error('non-ok')
    } catch (_) {
      const shiftRow = await swDbGet('shift', 'active')
      if (!shiftRow) return jsonResponse({ success: false, message: 'Offline – shift not found' }, 404)
      const { id: _key, ...shift } = shiftRow
      const session  = await swDbGet('session', 'current')
      const cashier  = session
        ? { _id: session.id, name: session.name, email: session.email }
        : (shift.cashier && typeof shift.cashier === 'object' ? shift.cashier : { name: shift.cashierName || '—' })
      return jsonResponse({ success: true, shift: { ...shift, cashier }, offline: true })
    }
  }

  // Auth routes — always network (login/logout)
  if (url.pathname.startsWith('/api/auth/')) {
    return fetch(request).catch(() =>
      jsonResponse({ success: false, message: 'No internet connection. Please connect to login.' }, 503)
    )
  }

  // All other API calls — network-first, graceful offline fallback
  return fetch(request).catch(() =>
    jsonResponse({ success: false, message: 'You are offline.', offline: true }, 503)
  )
}

// ─── Navigation handler ───────────────────────────────────────────────────────
async function navigationHandler(request) {
  const cache = await caches.open(CACHE_VERSION)
  const url   = new URL(request.url)

  // Try network first
  try {
    const networkRes = await fetch(request)
    if (networkRes.ok) {
      // Cache cashier + login pages
      if (url.pathname === '/cashier/pos' || url.pathname === '/login' || url.pathname === '/') {
        cache.put(request, networkRes.clone())
      }
      return networkRes
    }
  } catch (_) {
    // Network failed — fall through to cache
  }

  // Serve from cache
  const cached = await cache.match(request)
  if (cached) return cached

  // Last resort: try to serve the login page for any navigation
  const loginCached = await cache.match('/login')
  if (loginCached) return loginCached

  return new Response('<h1>Offline</h1><p>Please connect to the internet to load MyEasyTill.</p>', {
    status:  503,
    headers: { 'Content-Type': 'text/html' },
  })
}

// ─── Cache-first ─────────────────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const networkRes = await fetch(request)
  if (networkRes.ok) {
    const cache = await caches.open(CACHE_VERSION)
    cache.put(request, networkRes.clone())
  }
  return networkRes
}

// ─── Network-first ───────────────────────────────────────────────────────────
async function networkFirst(request) {
  try {
    const networkRes = await fetch(request)
    if (networkRes.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, networkRes.clone())
    }
    return networkRes
  } catch (_) {
    const cached = await caches.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

// ─── Network-first with IndexedDB fallback ───────────────────────────────────
async function networkFirstWithIndexedDB(request, onSuccess, onOffline) {
  try {
    const networkRes = await fetch(request)
    if (networkRes.ok) {
      const clone = networkRes.clone()
      // Cache in HTTP cache
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, networkRes.clone())
      // Also persist to IndexedDB for offline use
      try {
        const data = await clone.json()
        await onSuccess(data)
      } catch (_) {}
      return networkRes
    }
    throw new Error('Non-ok response')
  } catch (_) {
    // Try HTTP cache first
    const cached = await caches.match(request)
    if (cached) return cached
    // Then IndexedDB
    return onOffline()
  }
}

// ─── Background sync: pending offline orders ─────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-orders') {
    event.waitUntil(syncOfflineOrders())
  }
})

async function syncOfflineOrders() {
  try {
    const db     = await swOpenDB()
    const allTx  = db.transaction('orders_queue', 'readonly')
    const orders = await new Promise((res, rej) => {
      const req = allTx.objectStore('orders_queue').getAll()
      req.onsuccess = () => res(req.result ?? [])
      req.onerror   = () => rej(req.error)
    })

    for (const order of orders.filter(o => !o.synced)) {
      try {
        const res = await fetch('/api/orders', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(order.orderPayload),
        })
        if (res.ok) {
          const upTx = db.transaction('orders_queue', 'readwrite')
          upTx.objectStore('orders_queue').put({ ...order, synced: true })
        }
      } catch (_) {
        // Will retry next sync
      }
    }
  } catch (_) {}
}
