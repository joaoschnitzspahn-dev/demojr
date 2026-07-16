import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedMockOrders } from '@/mock/ordersMock'
import { createOrder } from '@/services/orderService'
import {
  completeStage,
  getCanCompleteStage,
  getOrderStatus as computeOrderStatus,
  toggleChecklistItem,
  updateStageObservations,
} from '@/services/workflowService'
import { canUserWorkOnStage } from '@/constants/users'
import { useAuthStore } from '@/store/authStore'
import type { Order, WorkflowStageId } from '@/types/workflow'

function getSessionUser() {
  return useAuthStore.getState().currentUser
}

type OrdersState = {
  orders: Order[]
  loading: boolean
  seeded: boolean

  selectedOrderId: string | null
  drawerOpen: boolean

  initialize: () => void
  selectOrder: (id: string) => void
  closeDrawer: () => void

  createOrder: (input: {
    client: string
    description: string
    observations: string
  }) => void

  toggleChecklistItem: (input: {
    orderId: string
    stageId: WorkflowStageId
    itemId: string
    checked: boolean
  }) => { ok: boolean; error?: string }

  updateStageObservations: (input: {
    orderId: string
    stageId: WorkflowStageId
    observations: string
  }) => void

  tryCompleteCurrentStage: (input: {
    orderId: string
    notes: string
  }) => { ok: boolean; error?: string }

  getOrderById: (id: string) => Order | undefined
  getOrderStatus: (order: Order) => ReturnType<typeof computeOrderStatus>
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      loading: false,
      seeded: false,

      selectedOrderId: null,
      drawerOpen: false,

      initialize: () => {
        if (get().seeded) return
        set({ loading: true })
        window.setTimeout(() => {
          const orders = seedMockOrders()
          set({ orders, loading: false, seeded: true })
        }, 650)
      },

      selectOrder: (id) => {
        set({ selectedOrderId: id, drawerOpen: true })
      },
      closeDrawer: () => {
        set({ drawerOpen: false })
      },

      createOrder: (input) => {
        const user = getSessionUser()
        if (!user) return

        const stateOrders = get().orders
        const max = stateOrders
          .map((o) => Number(o.number.match(/(\d+)/)?.[1] ?? '0'))
          .reduce((a, b) => Math.max(a, b), 0)
        const nextNumber = `PED-${String(max + 1).padStart(4, '0')}`

        const newOrder = createOrder({
          number: nextNumber,
          client: input.client,
          description: input.description,
          observations: input.observations,
          operatorId: user.name,
        })

        set((s) => ({
          orders: [newOrder, ...s.orders],
          selectedOrderId: newOrder.id,
          drawerOpen: true,
        }))
      },

      toggleChecklistItem: ({ orderId, stageId, itemId, checked }) => {
        const user = getSessionUser()
        if (!user) return { ok: false, error: 'Sessão expirada.' }
        if (!canUserWorkOnStage(user, stageId)) {
          return {
            ok: false,
            error: 'Você não tem permissão para atuar nesta etapa.',
          }
        }

        const state = get()
        const idx = state.orders.findIndex((o) => o.id === orderId)
        if (idx === -1) return { ok: false, error: 'Pedido não encontrado.' }

        try {
          const nextOrder = toggleChecklistItem({
            order: state.orders[idx],
            stageId,
            itemId,
            checked,
          })
          const orders = [...state.orders]
          orders[idx] = nextOrder
          set({ orders })
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro ao atualizar checklist.',
          }
        }
      },

      updateStageObservations: ({ orderId, stageId, observations }) => {
        const user = getSessionUser()
        if (!user || !canUserWorkOnStage(user, stageId)) return

        set((s) => {
          const idx = s.orders.findIndex((o) => o.id === orderId)
          if (idx === -1) return s

          try {
            const nextOrder = updateStageObservations({
              order: s.orders[idx],
              stageId,
              observations,
            })
            const orders = [...s.orders]
            orders[idx] = nextOrder
            return { orders }
          } catch {
            return s
          }
        })
      },

      tryCompleteCurrentStage: ({ orderId, notes }) => {
        const user = getSessionUser()
        if (!user) return { ok: false, error: 'Sessão expirada.' }

        const state = get()
        const idx = state.orders.findIndex((o) => o.id === orderId)
        if (idx === -1) return { ok: false, error: 'Pedido não encontrado.' }

        const order = state.orders[idx]

        if (!canUserWorkOnStage(user, order.currentStageId)) {
          return {
            ok: false,
            error: 'Você não tem permissão para concluir esta etapa.',
          }
        }

        if (!getCanCompleteStage(order, order.currentStageId)) {
          return {
            ok: false,
            error: 'Checklist obrigatório incompleto.',
          }
        }

        try {
          const { updatedOrder } = completeStage({
            order,
            operatorId: user.name,
            notes,
          })
          const orders = [...state.orders]
          orders[idx] = updatedOrder
          set({ orders })
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro ao concluir etapa.',
          }
        }
      },

      getOrderById: (id) => get().orders.find((o) => o.id === id),
      getOrderStatus: (order) => computeOrderStatus(order),
    }),
    {
      name: 'orders-workflow-v2',
      partialize: (state) => ({
        orders: state.orders,
        seeded: state.seeded,
      }),
    }
  )
)
