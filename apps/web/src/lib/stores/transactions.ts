import { get, writable, derived } from 'svelte/store'
import type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters
} from '@basic-budget/types'
import { transactionsApi } from '$api'
import {
  isOnline,
  addToPendingQueue,
  cacheTransactions,
  getCachedTransactions
} from '$lib/offline/db'
import { summaryStore } from './summary'
import { currentMonthStore } from './currentMonth'

interface TransactionsState {
  items: Transaction[]
  loading: boolean
  error: string | null
  hasMore: boolean
  cursor: string | null
  filters: TransactionFilters
  offline: boolean
  pendingCount: number
}

function createTransactionsStore() {
  const { subscribe, set, update } = writable<TransactionsState>({
    items: [],
    loading: false,
    error: null,
    hasMore: false,
    cursor: null,
    filters: {},
    offline: false,
    pendingCount: 0
  })

  return {
    subscribe,
    getFilters() {
      return get({ subscribe }).filters
    },

    async load(filters: TransactionFilters = {}) {
      const currentState = get({ subscribe })
      update((state) => ({ ...state, loading: true, error: null, filters }))

      // If offline, try to load from cache
      if (!isOnline()) {
        try {
          const cached = await getCachedTransactions()
          set({
            items: cached,
            loading: false,
            error: null,
            hasMore: false,
            cursor: null,
            filters,
            offline: true,
            pendingCount: currentState.pendingCount
          })
          return
        } catch {
          update((state) => ({
            ...state,
            loading: false,
            error: 'Offline - no cached data available',
            offline: true,
            pendingCount: currentState.pendingCount
          }))
          return
        }
      }

      try {
        const response = await transactionsApi.list(filters)

        // Cache the transactions for offline use
        await cacheTransactions(response.data).catch(() => {
          // Silently fail caching
        })

        set({
          items: response.data,
          loading: false,
          error: null,
          hasMore: response.has_more,
          cursor: response.next_cursor ?? null,
          filters,
          offline: false,
          pendingCount: 0
        })
      } catch (err) {
        // If network error, try cache
        try {
          const cached = await getCachedTransactions()
          set({
            items: cached,
            loading: false,
            error: 'Using cached data - network unavailable',
            hasMore: false,
            cursor: null,
            filters,
            offline: true,
            pendingCount: currentState.pendingCount
          })
        } catch {
          update((state) => ({
            ...state,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load transactions'
          }))
        }
      }
    },

    async loadMore() {
      let currentState: TransactionsState | undefined

      update((state) => {
        if (!state.hasMore || !state.cursor) {
          currentState = state
          return state
        }
        currentState = { ...state, loading: true }
        return currentState
      })

      if (!currentState || !currentState.hasMore || !currentState.cursor) return

      try {
        const response = await transactionsApi.list({
          ...currentState.filters,
          cursor: currentState.cursor
        })
        update((state) => ({
          ...state,
          items: [...state.items, ...response.data],
          loading: false,
          hasMore: response.has_more,
          cursor: response.next_cursor ?? null
        }))
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load more transactions'
        }))
      }
    },

    async create(data: CreateTransactionRequest) {
      update((state) => ({ ...state, loading: true, error: null }))

      // If offline, queue the transaction
      if (!isOnline()) {
        await addToPendingQueue('create', data)

        // Create optimistic local transaction
        const optimisticTx: Transaction = {
          id: `pending-${Date.now()}`,
          user_id: 'local',
          type: data.type,
          category_id: data.category_id,
          amount_cents: data.amount_cents,
          currency: data.currency,
          date: data.date,
          description: data.description ?? '',
          merchant: data.merchant ?? '',
          tags: data.tags ?? [],
          recurring_rule_id: data.recurring_rule_id ?? null,
          income_stream_id: data.income_stream_id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        update((state) => ({
          ...state,
          items: [optimisticTx, ...state.items],
          loading: false,
          pendingCount: state.pendingCount + 1
        }))

        return optimisticTx
      }

      try {
        const transaction = await transactionsApi.create(data)
        update((state) => ({
          ...state,
          items: [transaction, ...state.items],
          loading: false
        }))
        void summaryStore
          .loadMonth(get(currentMonthStore))
          .catch(() => {
            /* summaryStore.error will surface */
          })
        return transaction
      } catch (err) {
        // If network error, queue for later
        if (err instanceof TypeError && err.message.includes('fetch')) {
          await addToPendingQueue('create', data)
          update((state) => ({
            ...state,
            loading: false,
            error: 'Saved offline - will sync when online',
            pendingCount: state.pendingCount + 1
          }))
          return null as unknown as Transaction
        }

        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to create transaction'
        }))
        throw err
      }
    },

    async update(id: string, data: UpdateTransactionRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const updated = await transactionsApi.update(id, data)
        update((state) => ({
          ...state,
          items: state.items.map((tx) => (tx.id === id ? updated : tx)),
          loading: false
        }))
        void summaryStore
          .loadMonth(get(currentMonthStore))
          .catch(() => {
            /* summaryStore.error will surface */
          })
        return updated
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to update transaction'
        }))
        throw err
      }
    },

    async delete(id: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        await transactionsApi.delete(id)
        update((state) => ({
          ...state,
          items: state.items.filter((tx) => tx.id !== id),
          loading: false
        }))
        void summaryStore
          .loadMonth(get(currentMonthStore))
          .catch(() => {
            /* summaryStore.error will surface */
          })
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to delete transaction'
        }))
        throw err
      }
    },

    clear() {
      set({
        items: [],
        loading: false,
        error: null,
        hasMore: false,
        cursor: null,
        filters: {},
        offline: false,
        pendingCount: 0
      })
    },

    setOfflineStatus(offline: boolean) {
      update((state) => ({ ...state, offline }))
    },

    setPendingCount(count: number) {
      update((state) => ({ ...state, pendingCount: count }))
    }
  }
}

export const transactionsStore = createTransactionsStore()

export const transactionsByDate = derived(transactionsStore, ($transactions) => {
  const grouped: Record<string, Transaction[]> = {}
  for (const tx of $transactions.items) {
    if (!grouped[tx.date]) {
      grouped[tx.date] = []
    }
    const dateGroup = grouped[tx.date]
    if (dateGroup) {
      dateGroup.push(tx)
    }
  }
  return grouped
})
