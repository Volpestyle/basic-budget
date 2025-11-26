import type { AuthResponse, GoogleAuthRequest } from '@basic-budget/types'
import { api } from './client'

export const authApi = {
  loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const request: GoogleAuthRequest = { id_token: idToken }
    return api.post<AuthResponse>('/auth/google', request)
  }
}
