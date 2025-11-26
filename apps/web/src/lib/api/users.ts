import type { User, UpdateUserRequest } from '@basic-budget/types'
import { api } from './client'

export const usersApi = {
  getMe(): Promise<User> {
    return api.get<User>('/me')
  },

  updateMe(data: UpdateUserRequest): Promise<User> {
    return api.patch<User>('/me', data)
  }
}
