import type {
  IncomeStream,
  CreateIncomeStreamRequest,
  UpdateIncomeStreamRequest
} from '@basic-budget/types'
import { api } from './client'

export const incomeStreamsApi = {
  list(): Promise<IncomeStream[]> {
    return api.get<IncomeStream[]>('/income-streams')
  },

  create(data: CreateIncomeStreamRequest): Promise<IncomeStream> {
    return api.post<IncomeStream>('/income-streams', data)
  },

  update(id: string, data: UpdateIncomeStreamRequest): Promise<IncomeStream> {
    return api.patch<IncomeStream>(`/income-streams/${id}`, data)
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/income-streams/${id}`)
  }
}
