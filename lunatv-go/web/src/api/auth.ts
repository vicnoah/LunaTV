import { api } from './client'
import { setToken, setCurrentUser, clearToken, type UserInfo } from '@/lib/auth'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserInfo
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/login', req)
  setToken(res.token)
  setCurrentUser(res.user)
  return res
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout')
  } finally {
    clearToken()
  }
}

export interface RegisterRequest {
  username: string
  password: string
}

export async function register(req: RegisterRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/register', req)
  setToken(res.token)
  setCurrentUser(res.user)
  return res
}
