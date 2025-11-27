import type { Transaction, CreateTransactionRequest } from '@basic-budget/types'

const DB_NAME = 'basic-budget-offline'
const DB_VERSION = 1

interface PendingTransaction {
  id: string
  action: 'create' | 'update' | 'delete'
  data: CreateTransactionRequest | { id: string }
  timestamp: number
  retries: number
}

interface CachedData {
  key: string
  data: unknown
  timestamp: number
  expiresAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Store for pending transactions (offline queue)
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        const store = db.createObjectStore('pendingTransactions', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Store for cached API responses
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' })
        store.createIndex('expiresAt', 'expiresAt', { unique: false })
      }

      // Store for cached transactions
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('category_id', 'category_id', { unique: false })
      }
    }
  })

  return dbPromise
}

// Pending Transaction Queue
export async function addToPendingQueue(
  action: PendingTransaction['action'],
  data: PendingTransaction['data']
): Promise<string> {
  const db = await openDB()
  const id = `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const pending: PendingTransaction = {
    id,
    action,
    data,
    timestamp: Date.now(),
    retries: 0
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingTransactions', 'readwrite')
    const store = tx.objectStore('pendingTransactions')
    const request = store.add(pending)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(id)
  })
}

export async function getPendingQueue(): Promise<PendingTransaction[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingTransactions', 'readonly')
    const store = tx.objectStore('pendingTransactions')
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function removeFromPendingQueue(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingTransactions', 'readwrite')
    const store = tx.objectStore('pendingTransactions')
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function updatePendingRetries(id: string, retries: number): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingTransactions', 'readwrite')
    const store = tx.objectStore('pendingTransactions')
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const pending = getRequest.result as PendingTransaction | undefined
      if (pending) {
        pending.retries = retries
        const putRequest = store.put(pending)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      } else {
        resolve()
      }
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// Cache API
export async function cacheSet(key: string, data: unknown, ttlMs: number = 3600000): Promise<void> {
  const db = await openDB()
  const now = Date.now()

  const cached: CachedData = {
    key,
    data,
    timestamp: now,
    expiresAt: now + ttlMs
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    const store = tx.objectStore('cache')
    const request = store.put(cached)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly')
    const store = tx.objectStore('cache')
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cached = request.result as CachedData | undefined
      if (cached && cached.expiresAt > Date.now()) {
        resolve(cached.data as T)
      } else {
        resolve(null)
      }
    }
  })
}

export async function cacheDelete(key: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    const store = tx.objectStore('cache')
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function cacheClearExpired(): Promise<void> {
  const db = await openDB()
  const now = Date.now()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    const store = tx.objectStore('cache')
    const index = store.index('expiresAt')
    const range = IDBKeyRange.upperBound(now)
    const request = index.openCursor(range)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
  })
}

// Transaction Cache
export async function cacheTransactions(transactions: Transaction[]): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite')
    const store = tx.objectStore('transactions')

    for (const transaction of transactions) {
      store.put(transaction)
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedTransactions(): Promise<Transaction[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readonly')
    const store = tx.objectStore('transactions')
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function clearCachedTransactions(): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite')
    const store = tx.objectStore('transactions')
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Utility to check if online
export function isOnline(): boolean {
  return navigator.onLine
}

// Initialize and clean up on load
export async function initOfflineDB(): Promise<void> {
  await openDB()
  await cacheClearExpired()
}
