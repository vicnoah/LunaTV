const TOKEN_KEY = 'moontv_token'
const USER_KEY = 'moontv_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export interface UserInfo {
  username: string
  role: 'owner' | 'admin' | 'user'
}

export function getCurrentUser(): UserInfo | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try { return JSON.parse(stored) } catch { return null }
}

export function setCurrentUser(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
