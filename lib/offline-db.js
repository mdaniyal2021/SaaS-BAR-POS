/**
 * offline-db.js  —  Client-side IndexedDB utility
 * Import only in browser context (client components / useEffect).
 */

const DB_NAME    = 'myeasytill-offline'
const DB_VERSION = 2

// ─── Open / upgrade ───────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      // User credentials + PIN hash (keyed by email)
      if (!db.objectStoreNames.contains('credentials')) {
        db.createObjectStore('credentials', { keyPath: 'email' })
      }
      // Current offline session
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' })
      }
      // Cached products
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: '_id' })
      }
      // Cached categories
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: '_id' })
      }
      // Active shift (keyed by fixed string 'active')
      if (!db.objectStoreNames.contains('shift')) {
        db.createObjectStore('shift', { keyPath: 'id' })
      }
      // Offline orders queue (auto-increment localId)
      if (!db.objectStoreNames.contains('orders_queue')) {
        db.createObjectStore('orders_queue', { keyPath: 'localId', autoIncrement: true })
      }
    }

    req.onsuccess  = () => resolve(req.result)
    req.onerror    = () => reject(req.error)
  })
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
async function dbGet(store, key) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => res(req.result ?? null)
    req.onerror   = () => rej(req.error)
  })
}

async function dbPut(store, value) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value)
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

async function dbGetAll(store) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => res(req.result ?? [])
    req.onerror   = () => rej(req.error)
  })
}

async function dbDelete(store, key) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    req.onsuccess = () => res()
    req.onerror   = () => rej(req.error)
  })
}

async function dbClearAndPutAll(store, items) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    const s  = tx.objectStore(store)
    s.clear()
    items.forEach(item => s.put(item))
    tx.oncomplete = () => res()
    tx.onerror    = () => rej(tx.error)
  })
}

// ─── Credentials ─────────────────────────────────────────────────────────────

/** Save user data after a successful online login. */
export async function saveOfflineCredentials({ id, name, email, role, barId, barName }) {
  await dbPut('credentials', {
    email: email.toLowerCase(),
    id,
    name,
    role,
    barId,
    barName,
  })
}

// ─── Offline session ──────────────────────────────────────────────────────────

export async function setOfflineSession(user) {
  await dbPut('session', { key: 'current', ...user, isOffline: true, ts: Date.now() })
}

export async function getOfflineSession() {
  return dbGet('session', 'current')
}

export async function clearOfflineSession() {
  await dbDelete('session', 'current')
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function cacheProducts(products) {
  await dbClearAndPutAll('products', products)
}

export async function getCachedProducts() {
  return dbGetAll('products')
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function cacheCategories(categories) {
  await dbClearAndPutAll('categories', categories)
}

export async function getCachedCategories() {
  return dbGetAll('categories')
}

// ─── Shift ───────────────────────────────────────────────────────────────────

/** Cache the active shift returned from server. Pass null to clear. */
export async function cacheShift(shift) {
  if (!shift) { await dbDelete('shift', 'active'); return }
  await dbPut('shift', { ...shift, id: 'active' })
}

/** Return cached shift (strips internal `id` key). */
export async function getCachedShift() {
  const row = await dbGet('shift', 'active')
  if (!row) return null
  const { id: _id, ...shift } = row          // remove the keyPath field
  return shift
}

/**
 * Create a local offline shift (when network is unavailable).
 * Returns the fabricated shift object.
 */
export async function createOfflineShift({ openingCash, cashierId, barId, cashierName }) {
  const shift = {
    id:          'active',
    _id:         `offline_${Date.now()}`,
    isOffline:   true,
    pendingSync: true,
    status:      'active',
    cashier:     cashierId,
    bar:         barId,
    cashierName,
    openingCash: Number(openingCash) || 0,
    startTime:   new Date().toISOString(),
  }
  await dbPut('shift', shift)
  return shift
}

/** Mark offline shift as synced once internet returns. */
export async function markShiftSynced(serverShift) {
  await dbPut('shift', { ...serverShift, id: 'active', isOffline: false, pendingSync: false })
}

// ─── Offline orders queue ─────────────────────────────────────────────────────

/** Queue an order for later sync. Returns the localId. */
export async function queueOfflineOrder(orderPayload, receipt) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx  = db.transaction('orders_queue', 'readwrite')
    const req = tx.objectStore('orders_queue').add({
      orderPayload,
      receipt,
      createdAt: new Date().toISOString(),
      synced:    false,
    })
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

export async function getPendingOfflineOrders() {
  const all = await dbGetAll('orders_queue')
  return all.filter(o => !o.synced)
}

export async function markOrderSynced(localId) {
  const order = await dbGet('orders_queue', localId)
  if (order) await dbPut('orders_queue', { ...order, synced: true })
}
