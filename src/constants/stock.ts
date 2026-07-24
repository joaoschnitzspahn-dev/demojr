import type { StockItem } from '@/types/stock'
import type { ProductType } from '@/types/workflow'

/** Estoque inicial mockado. */
export const SEED_STOCK: StockItem[] = [
  { product: 'mini_rastreador', quantity: 100 },
  { product: 'lv12_4g', quantity: 50 },
]

export const STOCK_PRODUCT_ORDER: ProductType[] = [
  'mini_rastreador',
  'lv12_4g',
]
