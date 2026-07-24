import { PRODUCT_LABELS } from '@/constants/products'
import { SEED_STOCK } from '@/constants/stock'
import type { StockItem } from '@/types/stock'
import type { ProductType } from '@/types/workflow'

export class StockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StockError'
  }
}

export function normalizeStockItems(items: StockItem[] | undefined): StockItem[] {
  const byProduct = new Map<ProductType, number>()

  for (const seed of SEED_STOCK) {
    byProduct.set(seed.product, seed.quantity)
  }

  for (const item of items ?? []) {
    if (item?.product) {
      byProduct.set(item.product, Math.max(0, Math.floor(Number(item.quantity) || 0)))
    }
  }

  return SEED_STOCK.map((seed) => ({
    product: seed.product,
    quantity: byProduct.get(seed.product) ?? seed.quantity,
  }))
}

export function getAvailableQuantity(
  items: StockItem[],
  product: ProductType
): number {
  return items.find((i) => i.product === product)?.quantity ?? 0
}

export function canDebitStock(
  items: StockItem[],
  product: ProductType,
  quantity: number
): { ok: true } | { ok: false; available: number; required: number; error: string } {
  const required = Math.max(0, Math.floor(Number(quantity) || 0))
  const available = getAvailableQuantity(items, product)

  if (required <= 0) {
    return {
      ok: false,
      available,
      required,
      error: 'Quantidade de aparelhos inválida para baixa de estoque.',
    }
  }

  if (available < required) {
    return {
      ok: false,
      available,
      required,
      error: `Estoque insuficiente para ${PRODUCT_LABELS[product]}. Disponível: ${available}. Necessário: ${required}.`,
    }
  }

  return { ok: true }
}

export function adjustStockQuantity(
  items: StockItem[],
  product: ProductType,
  delta: number
): StockItem[] {
  const amount = Math.floor(Number(delta) || 0)
  if (amount === 0) return items

  const normalized = normalizeStockItems(items)
  return normalized.map((item) => {
    if (item.product !== product) return item
    const next = item.quantity + amount
    if (next < 0) {
      throw new StockError(
        `Estoque insuficiente para ${PRODUCT_LABELS[product]}. Disponível: ${item.quantity}. Necessário: ${Math.abs(amount)}.`
      )
    }
    return { ...item, quantity: next }
  })
}

export function debitStock(
  items: StockItem[],
  product: ProductType,
  quantity: number
): StockItem[] {
  const check = canDebitStock(items, product, quantity)
  if (!check.ok) throw new StockError(check.error)
  return adjustStockQuantity(items, product, -Math.floor(quantity))
}
