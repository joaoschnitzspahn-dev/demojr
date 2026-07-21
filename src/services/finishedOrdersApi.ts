import type { Order } from '@/types/workflow'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function getApiKey(): string | undefined {
  const key = import.meta.env.VITE_API_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : undefined
}

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }

  const apiKey = getApiKey()
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  return headers
}

export type ApiResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? `Erro ${res.status}`
  } catch {
    return `Erro ${res.status}`
  }
}

export async function fetchFinishedOrders(): Promise<ApiResult<Order[]>> {
  try {
    const res = await fetch(`${API_BASE}/finished-orders`, {
      headers: buildHeaders(),
    })

    if (!res.ok) {
      return { ok: false, error: await parseError(res) }
    }

    const body = (await res.json()) as { orders: Order[] }
    return { ok: true, data: body.orders ?? [] }
  } catch {
    return { ok: false, error: 'Servidor indisponível. Usando dados locais.' }
  }
}

export async function saveFinishedOrder(order: Order): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/finished-orders`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ order }),
    })

    if (!res.ok) {
      return { ok: false, error: await parseError(res) }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Não foi possível salvar no servidor.' }
  }
}

export async function syncFinishedOrders(orders: Order[]): Promise<ApiResult<Order[]>> {
  try {
    const res = await fetch(`${API_BASE}/finished-orders/sync`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ orders }),
    })

    if (!res.ok) {
      return { ok: false, error: await parseError(res) }
    }

    const body = (await res.json()) as { orders: Order[] }
    return { ok: true, data: body.orders ?? [] }
  } catch {
    return { ok: false, error: 'Não foi possível sincronizar com o servidor.' }
  }
}

export async function deleteFinishedOrderApi(
  orderId: string,
  adminLogin: string,
  adminPassword: string
): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/finished-orders/${orderId}`, {
      method: 'DELETE',
      headers: buildHeaders({
        'X-Admin-Login': adminLogin,
        'X-Admin-Password': adminPassword,
      }),
    })

    if (!res.ok) {
      return { ok: false, error: await parseError(res) }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Servidor indisponível.' }
  }
}

/** Erros em que a exclusão local ainda pode prosseguir. */
export function isDeleteServerOptionalError(error: string): boolean {
  const lower = error.toLowerCase()
  return (
    lower.includes('indisponível') ||
    lower.includes('servidor') ||
    lower.includes('não encontrado') ||
    lower.includes('404') ||
    lower.includes('failed to fetch') ||
    lower.includes('network')
  )
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
