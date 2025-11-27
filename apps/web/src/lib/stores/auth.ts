import { writable, derived } from 'svelte/store'
import type { User } from '@basic-budget/types'
import { api } from '$api'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  initialized: boolean
}

const STORAGE_KEY = 'basic-budget-auth'

function createAuthStore() {
  const initialState: AuthState = {
    token: null,
    user: null,
    loading: false,
    initialized: false
  }

  const { subscribe, set, update } = writable<AuthState>(initialState)

  return {
    subscribe,

    initialize() {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { token, user } = JSON.parse(stored) as { token: string; user: User }
        api.setToken(token)
        set({ token, user, loading: false, initialized: true })
      } else {
        set({ ...initialState, initialized: true })
      }
    },

    setAuth(token: string, user: User) {
      api.setToken(token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
      set({ token, user, loading: false, initialized: true })
    },

    updateUser(user: User) {
      update((state) => {
        if (state.token) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user }))
        }
        return { ...state, user }
      })
    },

    setLoading(loading: boolean) {
      update((state) => ({ ...state, loading }))
    },

    logout() {
      api.setToken(null)
      localStorage.removeItem(STORAGE_KEY)
      set({ token: null, user: null, loading: false, initialized: true })
    }
  }
}

export const authStore = createAuthStore()
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.token)
export const currentUser = derived(authStore, ($auth) => $auth.user)
export const authReady = derived(authStore, ($auth) => $auth.initialized && !!$auth.token)
