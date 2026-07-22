import type { AppUser } from '@/types/workflow'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function getApiKey(): string | undefined {
  const key = import.meta.env.VITE_API_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : undefined
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const apiKey = getApiKey()
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  return headers
}

export type UsersApiResult =
  | { ok: true; users: AppUser[] }
  | { ok: false; error: string }

export async function fetchUsersFromServer(): Promise<UsersApiResult> {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      headers: buildHeaders(),
    })
    if (!res.ok) {
      return { ok: false, error: `Erro ${res.status}` }
    }
    const body = (await res.json()) as { users: AppUser[] }
    return { ok: true, users: body.users ?? [] }
  } catch {
    return { ok: false, error: 'Servidor indisponível.' }
  }
}

export async function syncUsersToServer(
  users: AppUser[]
): Promise<UsersApiResult> {
  try {
    const res = await fetch(`${API_BASE}/users/sync`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ users }),
    })
    if (!res.ok) {
      return { ok: false, error: `Erro ${res.status}` }
    }
    const body = (await res.json()) as { users: AppUser[] }
    return { ok: true, users: body.users ?? [] }
  } catch {
    return { ok: false, error: 'Servidor indisponível.' }
  }
}
