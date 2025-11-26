import { writable, derived } from 'svelte/store'
import type { MonthBudget, BulkBudgetRequest } from '@basic-budget/types'
import { budgetsApi } from '$api'
import { currentMonthStore } from './currentMonth'

interface BudgetsState {
  items: MonthBudget[]
  month: string
  loading: boolean
  error: string | null
}

function createBudgetsStore() {
  const { subscribe, set, update } = writable<BudgetsState>({
    items: [],
    month: '',
    loading: false,
    error: null
  })

  return {
    subscribe,

    async load(month: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const budgets = await budgetsApi.getMonth(month)
        set({ items: budgets, month, loading: false, error: null })
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load budgets'
        }))
      }
    },

    async bulkUpsert(month: string, data: BulkBudgetRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const budgets = await budgetsApi.bulkUpsert(month, data)
        set({ items: budgets, month, loading: false, error: null })
        return budgets
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to update budgets'
        }))
        throw err
      }
    },

    clear() {
      set({ items: [], month: '', loading: false, error: null })
    }
  }
}

export const budgetsStore = createBudgetsStore()

export const budgetsByCategoryId = derived(budgetsStore, ($budgets) =>
  Object.fromEntries($budgets.items.map((b) => [b.category_id, b]))
)

// Auto-load budgets when month changes
let currentMonth = ''
currentMonthStore.subscribe((month) => {
  if (month !== currentMonth) {
    currentMonth = month
    // Don't auto-load here - let components trigger the load
  }
})
