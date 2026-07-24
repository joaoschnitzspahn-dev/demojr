import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_STOCK } from '@/constants/stock'
import {
  adjustStockQuantity,
  canDebitStock,
  debitStock,
  getAvailableQuantity,
  normalizeStockItems,
  StockError,
} from '@/services/stockService'
import type { StockItem } from '@/types/stock'
import type { ProductType } from '@/types/workflow'

type StockStoreState = {
  items: StockItem[]
  updatedAt: string | null

  getQuantity: (product: ProductType) => number
  addStock: (
    product: ProductType,
    amount: number
  ) => { ok: boolean; error?: string }
  removeStock: (
    product: ProductType,
    amount: number
  ) => { ok: boolean; error?: string }
  tryDebitForOrder: (
    product: ProductType,
    quantity: number
  ) => { ok: boolean; error?: string; available?: number; required?: number }
  canDebitForOrder: (
    product: ProductType,
    quantity: number
  ) => ReturnType<typeof canDebitStock>
}

function touch(items: StockItem[]) {
  return {
    items: normalizeStockItems(items),
    updatedAt: new Date().toISOString(),
  }
}

export const useStockStore = create<StockStoreState>()(
  persist(
    (set, get) => ({
      items: SEED_STOCK,
      updatedAt: null,

      getQuantity: (product) => getAvailableQuantity(get().items, product),

      addStock: (product, amount) => {
        const qty = Math.floor(Number(amount) || 0)
        if (qty <= 0) {
          return { ok: false, error: 'Informe uma quantidade maior que zero.' }
        }
        try {
          set((s) => touch(adjustStockQuantity(s.items, product, qty)))
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro ao adicionar estoque.',
          }
        }
      },

      removeStock: (product, amount) => {
        const qty = Math.floor(Number(amount) || 0)
        if (qty <= 0) {
          return { ok: false, error: 'Informe uma quantidade maior que zero.' }
        }
        try {
          set((s) => touch(adjustStockQuantity(s.items, product, -qty)))
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error:
              e instanceof StockError
                ? e.message
                : e instanceof Error
                  ? e.message
                  : 'Erro ao remover estoque.',
          }
        }
      },

      canDebitForOrder: (product, quantity) =>
        canDebitStock(get().items, product, quantity),

      tryDebitForOrder: (product, quantity) => {
        const check = canDebitStock(get().items, product, quantity)
        if (!check.ok) {
          return {
            ok: false,
            error: check.error,
            available: check.available,
            required: check.required,
          }
        }
        try {
          set((s) => touch(debitStock(s.items, product, quantity)))
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro na baixa de estoque.',
          }
        }
      },
    }),
    {
      name: 'stock-simplificado-v1',
      partialize: (state) => ({
        items: state.items,
        updatedAt: state.updatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.items = normalizeStockItems(state.items)
        }
      },
    }
  )
)
