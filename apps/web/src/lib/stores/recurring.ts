import { writable, derived } from 'svelte/store'
import type {
  RecurringRule,
  CreateRecurringRuleRequest,
  UpdateRecurringRuleRequest
} from '@basic-budget/types'
import { recurringApi } from '$api'

interface RecurringState {
  items: RecurringRule[]
  loading: boolean
  error: string | null
}

function createRecurringStore() {
  const { subscribe, set, update } = writable<RecurringState>({
    items: [],
    loading: false,
    error: null
  })

  return {
    subscribe,

    async load() {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const rules = await recurringApi.list()
        set({ items: rules, loading: false, error: null })
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load recurring rules'
        }))
      }
    },

    async create(data: CreateRecurringRuleRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const rule = await recurringApi.create(data)
        update((state) => ({
          ...state,
          items: [...state.items, rule],
          loading: false
        }))
        return rule
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to create recurring rule'
        }))
        throw err
      }
    },

    async update(id: string, data: UpdateRecurringRuleRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const updated = await recurringApi.update(id, data)
        update((state) => ({
          ...state,
          items: state.items.map((r) => (r.id === id ? updated : r)),
          loading: false
        }))
        return updated
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to update recurring rule'
        }))
        throw err
      }
    },

    async delete(id: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        await recurringApi.delete(id)
        update((state) => ({
          ...state,
          items: state.items.filter((r) => r.id !== id),
          loading: false
        }))
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to delete recurring rule'
        }))
        throw err
      }
    },

    clear() {
      set({ items: [], loading: false, error: null })
    }
  }
}

export const recurringStore = createRecurringStore()

export const recurringExpenses = derived(recurringStore, ($recurring) =>
  $recurring.items.filter((r) => r.type === 'expense')
)

export const recurringIncome = derived(recurringStore, ($recurring) =>
  $recurring.items.filter((r) => r.type === 'income')
)

export const upcomingRecurring = derived(recurringStore, ($recurring) => {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  return $recurring.items
    .filter((r) => {
      const nextOccurrence = new Date(r.next_occurrence)
      return nextOccurrence >= now && nextOccurrence <= thirtyDaysFromNow
    })
    .sort((a, b) => new Date(a.next_occurrence).getTime() - new Date(b.next_occurrence).getTime())
})
