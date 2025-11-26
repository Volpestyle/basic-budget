import { writable, derived } from 'svelte/store'
import type {
  IncomeStream,
  CreateIncomeStreamRequest,
  UpdateIncomeStreamRequest
} from '@basic-budget/types'
import { incomeStreamsApi } from '$api'

interface IncomeStreamsState {
  items: IncomeStream[]
  loading: boolean
  error: string | null
}

function createIncomeStreamsStore() {
  const { subscribe, set, update } = writable<IncomeStreamsState>({
    items: [],
    loading: false,
    error: null
  })

  return {
    subscribe,

    async load() {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const streams = await incomeStreamsApi.list()
        set({ items: streams, loading: false, error: null })
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load income streams'
        }))
      }
    },

    async create(data: CreateIncomeStreamRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const stream = await incomeStreamsApi.create(data)
        update((state) => ({
          ...state,
          items: [...state.items, stream],
          loading: false
        }))
        return stream
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to create income stream'
        }))
        throw err
      }
    },

    async update(id: string, data: UpdateIncomeStreamRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const updated = await incomeStreamsApi.update(id, data)
        update((state) => ({
          ...state,
          items: state.items.map((s) => (s.id === id ? updated : s)),
          loading: false
        }))
        return updated
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to update income stream'
        }))
        throw err
      }
    },

    async delete(id: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        await incomeStreamsApi.delete(id)
        update((state) => ({
          ...state,
          items: state.items.filter((s) => s.id !== id),
          loading: false
        }))
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to delete income stream'
        }))
        throw err
      }
    },

    clear() {
      set({ items: [], loading: false, error: null })
    }
  }
}

export const incomeStreamsStore = createIncomeStreamsStore()

export const activeIncomeStreams = derived(incomeStreamsStore, ($streams) =>
  $streams.items.filter((s) => s.active)
)

export const incomeStreamsById = derived(incomeStreamsStore, ($streams) =>
  Object.fromEntries($streams.items.map((s) => [s.id, s]))
)
