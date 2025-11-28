import type { CreateTransactionRequest } from '@basic-budget/types'
import { transactionsApi } from '$api'
import {
  getPendingQueue,
  removeFromPendingQueue,
  updatePendingRetries,
  isOnline
} from './db'

const MAX_RETRIES = 3
let syncInProgress = false

export async function syncPendingTransactions(): Promise<{ synced: number; failed: number }> {
  if (!isOnline() || syncInProgress) {
    return { synced: 0, failed: 0 }
  }

  syncInProgress = true
  let synced = 0
  let failed = 0

  try {
    const pendingQueue = await getPendingQueue()

    for (const pending of pendingQueue) {
      if (pending.retries >= MAX_RETRIES) {
        // Too many retries, remove from queue
        await removeFromPendingQueue(pending.id)
        failed++
        continue
      }

      try {
        switch (pending.action) {
          case 'create':
            await transactionsApi.create(pending.data as CreateTransactionRequest)
            break
          case 'update': {
            const updateData = pending.data as { id: string } & Partial<CreateTransactionRequest>
            await transactionsApi.update(updateData.id, updateData)
            break
          }
          case 'delete': {
            const deleteData = pending.data as { id: string }
            await transactionsApi.delete(deleteData.id)
            break
          }
        }

        await removeFromPendingQueue(pending.id)
        synced++
      } catch {
        // Increment retry count
        await updatePendingRetries(pending.id, pending.retries + 1)
        failed++
      }
    }
  } finally {
    syncInProgress = false
  }

  return { synced, failed }
}

// Set up online/offline listeners
export function setupSyncListeners(
  onSynced?: (result: { synced: number; failed: number }) => void | Promise<void>
): () => void {
  const runSync = async () => {
    const result = await syncPendingTransactions()
    if (result.synced > 0 || result.failed > 0) {
      console.log(`[Offline Sync] Synced: ${result.synced}, Failed: ${result.failed}`)
    }
    await onSynced?.(result)
  }

  const handleOnline = () => {
    console.log('[Offline Sync] Back online, syncing pending transactions...')
    void runSync()
  }

  window.addEventListener('online', handleOnline)

  // Initial sync if online
  if (isOnline()) {
    void runSync()
  }

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}

// Register for background sync if supported
export async function registerBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-transactions')
      return true
    } catch {
      console.log('[Offline Sync] Background sync registration failed')
      return false
    }
  }
  return false
}
