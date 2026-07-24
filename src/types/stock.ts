import type { ProductType } from '@/types/workflow'

export type StockItem = {
  product: ProductType
  quantity: number
}

export type StockStateSnapshot = {
  items: StockItem[]
  updatedAt: string
}
