import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@basic-budget/types'
import { api } from './client'

export const categoriesApi = {
  list(): Promise<Category[]> {
    return api.get<Category[]>('/categories')
  },

  create(data: CreateCategoryRequest): Promise<Category> {
    return api.post<Category>('/categories', data)
  },

  update(id: string, data: UpdateCategoryRequest): Promise<Category> {
    return api.patch<Category>(`/categories/${id}`, data)
  },

  archive(id: string): Promise<void> {
    return api.delete<void>(`/categories/${id}`)
  }
}
