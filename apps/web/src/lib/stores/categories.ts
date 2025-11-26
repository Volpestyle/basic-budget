import { writable, derived } from 'svelte/store'
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@basic-budget/types'
import { categoriesApi } from '$api'

interface CategoriesState {
  items: Category[]
  loading: boolean
  error: string | null
}

function createCategoriesStore() {
  const { subscribe, set, update } = writable<CategoriesState>({
    items: [],
    loading: false,
    error: null
  })

  return {
    subscribe,

    async load() {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const categories = await categoriesApi.list()
        set({ items: categories, loading: false, error: null })
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load categories'
        }))
      }
    },

    async create(data: CreateCategoryRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const category = await categoriesApi.create(data)
        update((state) => ({
          ...state,
          items: [...state.items, category],
          loading: false
        }))
        return category
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to create category'
        }))
        throw err
      }
    },

    async update(id: string, data: UpdateCategoryRequest) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        const updated = await categoriesApi.update(id, data)
        update((state) => ({
          ...state,
          items: state.items.map((cat) => (cat.id === id ? updated : cat)),
          loading: false
        }))
        return updated
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to update category'
        }))
        throw err
      }
    },

    async archive(id: string) {
      update((state) => ({ ...state, loading: true, error: null }))
      try {
        await categoriesApi.archive(id)
        update((state) => ({
          ...state,
          items: state.items.map((cat) =>
            cat.id === id ? { ...cat, is_archived: true } : cat
          ),
          loading: false
        }))
      } catch (err) {
        update((state) => ({
          ...state,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to archive category'
        }))
        throw err
      }
    },

    clear() {
      set({ items: [], loading: false, error: null })
    }
  }
}

export const categoriesStore = createCategoriesStore()

export const activeCategories = derived(categoriesStore, ($categories) =>
  $categories.items.filter((cat) => !cat.is_archived)
)

export const expenseCategories = derived(activeCategories, ($active) =>
  $active.filter((cat) => cat.type === 'expense')
)

export const incomeCategories = derived(activeCategories, ($active) =>
  $active.filter((cat) => cat.type === 'income')
)

export const categoriesById = derived(categoriesStore, ($categories) =>
  Object.fromEntries($categories.items.map((cat) => [cat.id, cat]))
)
