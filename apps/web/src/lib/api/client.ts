import type { ApiError } from '@basic-budget/types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null): void {
    this.token = token
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers
    }

    if (this.token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: response.statusText,
        code: `HTTP_${response.status}`
      }))
      throw new ApiClientError(error.error, error.code, response.status)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    let url = path
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url = `${path}?${queryString}`
      }
    }
    return this.request<T>('GET', url)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}

export class ApiClientError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
  }
}

export const api = new ApiClient(API_BASE_URL)
