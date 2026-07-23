import type { Order } from '@/types/workflow'
import type { ApiResult } from '@/services/finishedOrdersApi'

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
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  return headers
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? `Erro ${res.status}`
  } catch {
    return `Erro ${res.status}`
  }
}

export async function fetchAllOrders(): Promise<ApiResult<Order[]>> {
  try {
    const res = await fetch(`${API_BASE}/orders`, { headers: buildHeaders() })
    if (!res.ok) return { ok: false, error: await parseError(res) }
    const body = (await res.json()) as { orders: Order[] }
    return { ok: true, data: body.orders ?? [] }
  } catch {
    return { ok: false, error: 'Servidor indisponível.' }
  }
}

export async function saveOrderToServer(order: Order): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ order }),
    })
    if (!res.ok) return { ok: false, error: await parseError(res) }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Não foi possível salvar o pedido no servidor.' }
  }
}

export async function syncAllOrders(
  orders: Order[]
): Promise<ApiResult<Order[]>> {
  try {
    const res = await fetch(`${API_BASE}/orders/sync`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ orders }),
    })
    if (!res.ok) return { ok: false, error: await parseError(res) }
    const body = (await res.json()) as { orders: Order[] }
    return { ok: true, data: body.orders ?? [] }
  } catch {
    return { ok: false, error: 'Não foi possível sincronizar pedidos.' }
  }
}

export async function deleteOrderOnServer(
  orderId: string,
  adminLogin: string,
  adminPassword: string
): Promise<ApiResult> {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        ...buildHeaders(),
        'X-Admin-Login': adminLogin,
        'X-Admin-Password': adminPassword,
      },
    })
    if (!res.ok) return { ok: false, error: await parseError(res) }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Servidor indisponível.' }
  }
}
