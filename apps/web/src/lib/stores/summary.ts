import { writable } from 'svelte/store'
import type { MonthlySummary, CashFlowSummary } from '@basic-budget/types'
import { summaryApi } from '$api'

interface SummaryState {
  monthly: MonthlySummary | null
  cashFlow: CashFlowSummary | null
  loading: boolean
  error: string | null
}

function createSummaryStore() {
  const { subscribe, set, update } = writable<SummaryState>({
    monthly: null,
    cashFlow: null,
    loading: false,
    error: null
  })

  return {
    subscribe,

    async loadMonth(month: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const summary = await summaryApi.getMonth(month)
        update((state) => ({ ...state, monthly: summary, loading: false }))
        return summary
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load monthly summary'
        }))
        throw err
      }
    },

    async loadCashFlow(from?: string, to?: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const cashFlow = await summaryApi.getCashFlow(from, to)
        update((state) => ({ ...state, cashFlow, loading: false }))
        return cashFlow
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load cash flow'
        }))
        throw err
      }
    },

    clear() {
      set({ monthly: null, cashFlow: null, loading: false, error: null })
    }
  }
}

export const summaryStore = createSummaryStore()
