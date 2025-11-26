import type { MonthBudget, BulkBudgetRequest } from '@basic-budget/types'
import { api } from './client'

export const budgetsApi = {
  getMonth(month: string): Promise<MonthBudget[]> {
    return api.get<MonthBudget[]>(`/budgets/${month}`)
  },

  bulkUpsert(month: string, data: BulkBudgetRequest): Promise<MonthBudget[]> {
    return api.put<MonthBudget[]>(`/budgets/${month}`, data)
  }
}
