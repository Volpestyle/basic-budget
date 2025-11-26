import type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  PaginatedResponse
} from '@basic-budget/types'
import { api } from './client'

export const transactionsApi = {
  list(filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> {
    return api.get<PaginatedResponse<Transaction>>('/transactions', filters as Record<string, string | number | undefined>)
  },

  create(data: CreateTransactionRequest): Promise<Transaction> {
    return api.post<Transaction>('/transactions', data)
  },

  update(id: string, data: UpdateTransactionRequest): Promise<Transaction> {
    return api.patch<Transaction>(`/transactions/${id}`, data)
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/transactions/${id}`)
  }
}
