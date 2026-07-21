import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedMockOrders } from '@/mock/ordersMock'
import { createOrder } from '@/services/orderService'
import {
  activateRenovacaoIfDue,
  completeStage,
  ensureReminderStatuses,
  getCanCompleteStage,
  getOrderStatus as computeOrderStatus,
  toggleChecklistItem,
  updateOrderShippingFields,
  updateStageObservations,
} from '@/services/workflowService'
import { canUserWorkOnStage, isAdminUser } from '@/constants/users'
import { useAuthStore } from '@/store/authStore'
import {
  deleteFinishedOrderApi,
  fetchFinishedOrders,
  isDeleteServerOptionalError,
  saveFinishedOrder,
  syncFinishedOrders,
} from '@/services/finishedOrdersApi'
import type { Order, ProductType, WorkflowStageId } from '@/types/workflow'

function getSessionUser() {
  return useAuthStore.getState().currentUser
}

function refreshOrders(orders: Order[]): Order[] {
  return orders.map((o) =>
    activateRenovacaoIfDue(
      ensureReminderStatuses({
        ...o,
        prontosoftOrderNumber: o.prontosoftOrderNumber ?? '',
      })
    )
  )
}

function mergeFinishedOrders(
  localOrders: Order[],
  serverOrders: Order[],
  deletedIds: string[] = []
): Order[] {
  const deleted = new Set(deletedIds)
  const serverById = new Map(
    serverOrders.filter((o) => !deleted.has(o.id)).map((o) => [o.id, o])
  )
  const activeOrders = localOrders.filter((o) => !o.completedAt)
  const mergedFinished = [...serverById.values()]

  for (const order of localOrders) {
    if (
      order.completedAt &&
      !serverById.has(order.id) &&
      !deleted.has(order.id)
    ) {
      mergedFinished.push(order)
    }
  }

  mergedFinished.sort(
    (a, b) =>
      new Date(b.completedAt ?? 0).getTime() -
      new Date(a.completedAt ?? 0).getTime()
  )

  return [...activeOrders, ...mergedFinished]
}

type OrdersState = {
  orders: Order[]
  deletedFinishedOrderIds: string[]
  loading: boolean
  seeded: boolean
  syncingFinished: boolean
  serverOnline: boolean | null

  selectedOrderId: string | null
  drawerOpen: boolean

  initialize: () => Promise<void>
  syncFinishedFromServer: () => Promise<{ ok: boolean; error?: string }>
  selectOrder: (id: string) => void
  closeDrawer: () => void

  createOrder: (input: {
    client: string
    cpf: string
    email: string
    phone: string
    product: ProductType
    observations: string
    prontosoftOrderNumber: string
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

  updateShippingFields: (input: {
    orderId: string
    trackingCode?: string
    imeis?: string
    tags?: string
  }) => { ok: boolean; error?: string }

  tryCompleteCurrentStage: (input: {
    orderId: string
    notes: string
  }) => { ok: boolean; error?: string }

  deleteFinishedOrder: (
    orderId: string
  ) => Promise<{ ok: boolean; error?: string; warning?: string }>

  getOrderById: (id: string) => Order | undefined
  getOrderStatus: (order: Order) => ReturnType<typeof computeOrderStatus>
  getActiveOrders: () => Order[]
  getFinishedOrders: () => Order[]
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      deletedFinishedOrderIds: [],
      loading: false,
      seeded: false,
      syncingFinished: false,
      serverOnline: null,

      selectedOrderId: null,
      drawerOpen: false,

      initialize: async () => {
        if (get().seeded) {
          set((s) => ({ orders: refreshOrders(s.orders) }))
          await get().syncFinishedFromServer()
          return
        }

        set({ loading: true })
        await new Promise((r) => window.setTimeout(r, 650))

        const orders = refreshOrders(seedMockOrders())
        set({ orders, loading: false, seeded: true })
        await get().syncFinishedFromServer()
      },

      syncFinishedFromServer: async () => {
        set({ syncingFinished: true })

        const state = get()
        const deletedIds = state.deletedFinishedOrderIds ?? []
        const localFinished = state.orders.filter(
          (o) => Boolean(o.completedAt) && !deletedIds.includes(o.id)
        )

        const syncResult = await syncFinishedOrders(localFinished)
        if (syncResult.ok && syncResult.data) {
          set((s) => ({
            orders: mergeFinishedOrders(
              s.orders,
              syncResult.data!,
              s.deletedFinishedOrderIds ?? []
            ),
            serverOnline: true,
            syncingFinished: false,
          }))
          return { ok: true }
        }

        const fetchResult = await fetchFinishedOrders()
        if (fetchResult.ok && fetchResult.data) {
          set((s) => ({
            orders: mergeFinishedOrders(
              s.orders,
              fetchResult.data!,
              s.deletedFinishedOrderIds ?? []
            ),
            serverOnline: true,
            syncingFinished: false,
          }))
          return { ok: true }
        }

        set({ serverOnline: false, syncingFinished: false })
        const errorMessage =
          !syncResult.ok
            ? syncResult.error
            : !fetchResult.ok
              ? fetchResult.error
              : 'Erro ao sincronizar.'
        return { ok: false, error: errorMessage }
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
          cpf: input.cpf,
          email: input.email,
          phone: input.phone,
          product: input.product,
          observations: input.observations,
          prontosoftOrderNumber: input.prontosoftOrderNumber,
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
            error: 'Você não tem permissão para atuar neste processo.',
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

      updateShippingFields: ({ orderId, trackingCode, imeis, tags }) => {
        const user = getSessionUser()
        if (!user) return { ok: false, error: 'Sessão expirada.' }

        const state = get()
        const idx = state.orders.findIndex((o) => o.id === orderId)
        if (idx === -1) return { ok: false, error: 'Pedido não encontrado.' }

        try {
          const nextOrder = updateOrderShippingFields({
            order: state.orders[idx],
            trackingCode,
            imeis,
            tags,
            operatorId: user.name,
          })
          const orders = [...state.orders]
          orders[idx] = nextOrder
          set({ orders })
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro ao atualizar campos.',
          }
        }
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
            error: 'Você não tem permissão para concluir este processo.',
          }
        }

        if (!getCanCompleteStage(order, order.currentStageId)) {
          return {
            ok: false,
            error:
              order.currentStageId === 2 && !order.trackingCode.trim()
                ? 'Informe o código de rastreio.'
                : 'Checklist obrigatório incompleto.',
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

          if (updatedOrder.completedAt) {
            void saveFinishedOrder(updatedOrder).then((result) => {
              if (result.ok) {
                set({ serverOnline: true })
              }
            })
          }

          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro ao concluir processo.',
          }
        }
      },

      deleteFinishedOrder: async (orderId) => {
        const user = getSessionUser()
        if (!user || !isAdminUser(user)) {
          return { ok: false, error: 'Apenas o administrador pode excluir.' }
        }

        const order = get().orders.find((o) => o.id === orderId)
        if (!order?.completedAt) {
          return {
            ok: false,
            error: 'Somente pedidos finalizados podem ser excluídos.',
          }
        }

        const adminRecord =
          useAuthStore.getState().users.find((u) => isAdminUser(u)) ?? user

        const apiResult = await deleteFinishedOrderApi(
          orderId,
          adminRecord.login,
          adminRecord.password
        )

        if (!apiResult.ok && !isDeleteServerOptionalError(apiResult.error)) {
          return apiResult
        }

        set((s) => ({
          orders: s.orders.filter((o) => o.id !== orderId),
          deletedFinishedOrderIds: (s.deletedFinishedOrderIds ?? []).includes(
            orderId
          )
            ? s.deletedFinishedOrderIds ?? []
            : [...(s.deletedFinishedOrderIds ?? []), orderId],
          selectedOrderId:
            s.selectedOrderId === orderId ? null : s.selectedOrderId,
          drawerOpen: s.selectedOrderId === orderId ? false : s.drawerOpen,
        }))

        if (!apiResult.ok) {
          return {
            ok: true,
            warning:
              'Removido da lista local. Inicie o servidor (npm run server) para excluir do banco central.',
          }
        }

        return { ok: true }
      },

      getOrderById: (id) => get().orders.find((o) => o.id === id),
      getOrderStatus: (order) => computeOrderStatus(order),
      getActiveOrders: () =>
        refreshOrders(get().orders).filter((o) => !o.completedAt || o.currentStageId === 6),
      getFinishedOrders: () =>
        get().orders.filter((o) => Boolean(o.completedAt)),
    }),
    {
      name: 'orders-workflow-v3',
      partialize: (state) => ({
        orders: state.orders,
        seeded: state.seeded,
        deletedFinishedOrderIds: state.deletedFinishedOrderIds,
      }),
    }
  )
)
