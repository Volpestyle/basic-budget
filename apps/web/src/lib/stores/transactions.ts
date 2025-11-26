import { writable, derived } from 'svelte/store'
import type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters
} from '@basic-budget/types'
import { transactionsApi } from '$api'

interface TransactionsState {
  items: Transaction[]
  loading: boolean
  error: string | null
  hasMore: boolean
  cursor: string | null
  filters: TransactionFilters
}

function createTransactionsStore() {
  const { subscribe, set, update } = writable<TransactionsState>({
    items: [],
    loading: false,
    error: null,
    hasMore: false,
    cursor: null,
    filters: {}
  })

  return {
    subscribe,

    async load(filters: TransactionFilters = {}) {
      update((state) => ({ ...state, loading: true, error: null, filters }))
      try {
        const response = await transactionsApi.list(filters)
        set({
          items: response.data,
          loading: false,
          error: null,
          hasMore: response.has_more,
          cursor: response.next_cursor ?? null,
          filters
        })
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load transactions'
        }))
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
      try {
        const transaction = await transactionsApi.create(data)
        update((state) => ({
          ...state,
          items: [transaction, ...state.items],
          loading: false
        }))
        return transaction
      } catch (err) {
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
        filters: {}
      })
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
