const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && path !== '/auth/login') {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`
      const retry = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erro na requisição')
      }
      return retry.json()
    }
    accessToken = null
    window.dispatchEvent(new Event('auth:logout'))
    window.location.href = '/login'
    throw new Error('Sessão expirada.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Ocorreu um erro inesperado')
  }

  return res.json()
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json()
    accessToken = data.access_token
    return true
  } catch {
    return false
  }
}

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string) =>
    request<T>(path),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}
