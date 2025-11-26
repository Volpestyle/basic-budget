import type {
  RecurringRule,
  CreateRecurringRuleRequest,
  UpdateRecurringRuleRequest
} from '@basic-budget/types'
import { api } from './client'

export const recurringApi = {
  list(): Promise<RecurringRule[]> {
    return api.get<RecurringRule[]>('/recurring')
  },

  create(data: CreateRecurringRuleRequest): Promise<RecurringRule> {
    return api.post<RecurringRule>('/recurring', data)
  },

  update(id: string, data: UpdateRecurringRuleRequest): Promise<RecurringRule> {
    return api.patch<RecurringRule>(`/recurring/${id}`, data)
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/recurring/${id}`)
  }
}
