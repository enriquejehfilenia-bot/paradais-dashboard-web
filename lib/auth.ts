const TOKEN_KEY = 'pd_token'
const ROLE_KEY  = 'pd_role'

function setCookie(name: string, value: string, hours: number) {
  if (typeof document === 'undefined') return
  const exp = new Date(Date.now() + hours * 3600 * 1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${exp}; path=/; SameSite=Strict`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export function saveAuth(token: string, role: 'admin' | 'user') {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, role)
  setCookie(TOKEN_KEY, token, 8)
  setCookie(ROLE_KEY, role, 8)
}

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRole(): 'admin' | 'user' | null {
  if (typeof localStorage === 'undefined') return null
  const r = localStorage.getItem(ROLE_KEY)
  return r === 'admin' || r === 'user' ? r : null
}

export function isAdmin(): boolean {
  return getRole() === 'admin'
}

export function getAuth(): { token: string; role: 'admin' | 'user' } | null {
  const token = getToken()
  const role  = getRole()
  if (!token || !role) return null
  return { token, role }
}

export function clearAuth() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
  }
  deleteCookie(TOKEN_KEY)
  deleteCookie(ROLE_KEY)
}
