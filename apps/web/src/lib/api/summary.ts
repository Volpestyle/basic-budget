import type { MonthlySummary, CashFlowSummary } from '@basic-budget/types'
import { api } from './client'

export const summaryApi = {
  getMonth(month: string): Promise<MonthlySummary> {
    return api.get<MonthlySummary>(`/summary/month/${month}`)
  },

  getCashFlow(from?: string, to?: string): Promise<CashFlowSummary> {
    return api.get<CashFlowSummary>('/summary/cashflow', { from, to })
  }
}
