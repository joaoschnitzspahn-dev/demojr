import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedMockOrders } from '@/mock/ordersMock'
import { createOrder } from '@/services/orderService'
import {
  activateRenovacaoIfDue,
  applyImeiSpreadsheetImport,
  attachInvoiceToOrder,
  completeStage,
  ensureReminderStatuses,
  getCanCompleteStage,
  getOrderStatus as computeOrderStatus,
  migrateWorkflowOrder,
  recordStockDebitHistory,
  syncChecklistsWithTemplates,
  toggleChecklistItem,
  updateOrderShippingFields,
  updateProntosoftOrderNumber,
  updateStageObservations,
} from '@/services/workflowService'
import type { InvoiceAttachment } from '@/types/workflow'
import { canUserWorkOnStage, isAdminUser } from '@/constants/users'
import { useAuthStore } from '@/store/authStore'
import { useStockStore } from '@/store/stockStore'
import {
  deleteFinishedOrderApi,
  fetchFinishedOrders,
  isDeleteServerOptionalError,
  saveFinishedOrder,
  syncFinishedOrders,
} from '@/services/finishedOrdersApi'
import {
  deleteOrderOnServer,
  saveOrderToServer,
  syncAllOrders,
} from '@/services/ordersApi'
import type { Order, ProductType, WorkflowStageId } from '@/types/workflow'

function getSessionUser() {
  return useAuthStore.getState().currentUser
}

function refreshOrders(orders: Order[]): Order[] {
  return orders.map((o) =>
    activateRenovacaoIfDue(
      ensureReminderStatuses(
        syncChecklistsWithTemplates(
          migrateWorkflowOrder({
            ...o,
            prontosoftOrderNumber: o.prontosoftOrderNumber ?? '',
            tags: o.tags ?? '',
          })
        )
      )
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

/** Mescla todos os pedidos (ativos + finalizados) priorizando o mais recente. */
function mergeAllOrders(
  localOrders: Order[],
  serverOrders: Order[],
  deletedIds: string[] = []
): Order[] {
  const deleted = new Set(deletedIds)
  const byId = new Map<string, Order>()

  for (const order of [...serverOrders, ...localOrders]) {
    if (deleted.has(order.id)) continue
    const existing = byId.get(order.id)
    if (!existing) {
      byId.set(order.id, order)
      continue
    }
    const existingUpdated = new Date(
      (existing as Order & { updatedAt?: string }).updatedAt ??
        existing.completedAt ??
        existing.createdAt
    ).getTime()
    const nextUpdated = new Date(
      (order as Order & { updatedAt?: string }).updatedAt ??
        order.completedAt ??
        order.createdAt
    ).getTime()
    byId.set(order.id, nextUpdated >= existingUpdated ? order : existing)
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function persistOrderRemote(order: Order) {
  void saveOrderToServer(order).then((result) => {
    if (result.ok && order.completedAt) {
      void saveFinishedOrder(order)
    }
  })
}

type OrdersState = {
  orders: Order[]
  deletedFinishedOrderIds: string[]
  loading: boolean
  seeded: boolean
  syncingFinished: boolean
  serverOnline: boolean | null
  lastAutoSyncAt: string | null

  selectedOrderId: string | null
  drawerOpen: boolean

  initialize: () => Promise<void>
  syncFinishedFromServer: () => Promise<{ ok: boolean; error?: string }>
  autoSync: () => Promise<{ ok: boolean; error?: string }>
  selectOrder: (id: string) => void
  closeDrawer: () => void

  createOrder: (input: {
    client: string
    cpf: string
    email: string
    phone: string
    product: ProductType
    observations: string
    deviceQuantity: number
    prontosoftOrderNumber: string
  }) => void

  attachInvoice: (input: {
    orderId: string
    attachment: InvoiceAttachment
  }) => { ok: boolean; error?: string }

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
  }) => { ok: boolean; error?: string }

  importImeisFromSpreadsheet: (input: {
    orderId: string
    imeis: string[]
    fileName: string
  }) => { ok: boolean; error?: string }

  updateProntosoftNumber: (input: {
    orderId: string
    value: string
  }) => { ok: boolean; error?: string }

  tryCompleteCurrentStage: (input: {
    orderId: string
    notes: string
    /** Na Expedição: se true, tenta dar baixa no estoque antes de concluir. */
    debitStock?: boolean
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
      lastAutoSyncAt: null,

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
        const localOrders = state.orders.filter((o) => !deletedIds.includes(o.id))
        const localFinished = localOrders.filter((o) => Boolean(o.completedAt))

        // 1) Sincroniza TODOS os pedidos (ativos + finalizados) no banco
        const allSync = await syncAllOrders(localOrders)
        if (allSync.ok && allSync.data) {
          set((s) => ({
            orders: refreshOrders(
              mergeAllOrders(s.orders, allSync.data!, s.deletedFinishedOrderIds ?? [])
            ),
          }))
        }

        // 2) Mantém tabela de finalizados atualizada
        const syncResult = await syncFinishedOrders(localFinished)
        if (syncResult.ok && syncResult.data) {
          set((s) => ({
            orders: refreshOrders(
              mergeFinishedOrders(
                s.orders,
                syncResult.data!,
                s.deletedFinishedOrderIds ?? []
              )
            ),
            serverOnline: true,
            syncingFinished: false,
            lastAutoSyncAt: new Date().toISOString(),
          }))
          return { ok: true }
        }

        if (allSync.ok) {
          set({
            serverOnline: true,
            syncingFinished: false,
            lastAutoSyncAt: new Date().toISOString(),
          })
          return { ok: true }
        }

        const fetchResult = await fetchFinishedOrders()
        if (fetchResult.ok && fetchResult.data) {
          set((s) => ({
            orders: refreshOrders(
              mergeFinishedOrders(
                s.orders,
                fetchResult.data!,
                s.deletedFinishedOrderIds ?? []
              )
            ),
            serverOnline: true,
            syncingFinished: false,
            lastAutoSyncAt: new Date().toISOString(),
          }))
          return { ok: true }
        }

        set({ serverOnline: false, syncingFinished: false })
        const errorMessage =
          !allSync.ok
            ? allSync.error
            : !syncResult.ok
              ? syncResult.error
              : !fetchResult.ok
                ? fetchResult.error
                : 'Erro ao sincronizar.'
        return { ok: false, error: errorMessage }
      },

      autoSync: async () => {
        set((s) => ({ orders: refreshOrders(s.orders) }))
        return get().syncFinishedFromServer()
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
          deviceQuantity: input.deviceQuantity,
          prontosoftOrderNumber: input.prontosoftOrderNumber,
          operatorId: user.name,
        })

        set((s) => ({
          orders: [newOrder, ...s.orders],
          selectedOrderId: newOrder.id,
          drawerOpen: true,
        }))
        persistOrderRemote(newOrder)
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
          persistOrderRemote(nextOrder)
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
            persistOrderRemote(nextOrder)
            return { orders }
          } catch {
            return s
          }
        })
      },

      updateShippingFields: ({ orderId, trackingCode, imeis }) => {
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
            operatorId: user.name,
          })
          const orders = [...state.orders]
          orders[idx] = nextOrder
          set({ orders })
          persistOrderRemote(nextOrder)
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : 'Erro ao atualizar campos.',
          }
        }
      },

      importImeisFromSpreadsheet: ({ orderId, imeis, fileName }) => {
        const user = getSessionUser()
        if (!user) return { ok: false, error: 'Sessão expirada.' }
        if (!canUserWorkOnStage(user, 3)) {
          return {
            ok: false,
            error: 'Você não tem permissão para atuar neste processo.',
          }
        }

        const state = get()
        const idx = state.orders.findIndex((o) => o.id === orderId)
        if (idx === -1) return { ok: false, error: 'Pedido não encontrado.' }

        try {
          const nextOrder = applyImeiSpreadsheetImport({
            order: state.orders[idx],
            imeis,
            fileName,
            operatorId: user.name,
          })
          const orders = [...state.orders]
          orders[idx] = nextOrder
          set({ orders })
          persistOrderRemote(nextOrder)
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error:
              e instanceof Error
                ? e.message
                : 'Erro ao importar planilha de IMEIs.',
          }
        }
      },

      attachInvoice: ({ orderId, attachment }) => {
        const user = getSessionUser()
        if (!user) return { ok: false, error: 'Sessão expirada.' }
        if (!canUserWorkOnStage(user, 2)) {
          return {
            ok: false,
            error: 'Você não tem permissão para atuar neste processo.',
          }
        }

        const state = get()
        const idx = state.orders.findIndex((o) => o.id === orderId)
        if (idx === -1) return { ok: false, error: 'Pedido não encontrado.' }

        try {
          const nextOrder = attachInvoiceToOrder({
            order: state.orders[idx],
            attachment,
            operatorId: user.name,
          })
          const orders = [...state.orders]
          orders[idx] = nextOrder
          set({ orders })
          persistOrderRemote(nextOrder)
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error:
              e instanceof Error ? e.message : 'Erro ao anexar Nota Fiscal.',
          }
        }
      },
      updateProntosoftNumber: ({ orderId, value }) => {
        const user = getSessionUser()
        if (!user) return { ok: false, error: 'Sessão expirada.' }

        const state = get()
        const idx = state.orders.findIndex((o) => o.id === orderId)
        if (idx === -1) return { ok: false, error: 'Pedido não encontrado.' }

        const order = state.orders[idx]
        if (!canUserWorkOnStage(user, 1)) {
          return {
            ok: false,
            error: 'Você não tem permissão para atuar neste processo.',
          }
        }

        try {
          const nextOrder = updateProntosoftOrderNumber({
            order,
            value,
            operatorId: user.name,
          })
          const orders = [...state.orders]
          orders[idx] = nextOrder
          set({ orders })
          persistOrderRemote(nextOrder)
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            error:
              e instanceof Error
                ? e.message
                : 'Erro ao vincular número Prontosoft.',
          }
        }
      },

      tryCompleteCurrentStage: ({ orderId, notes, debitStock }) => {
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
              order.currentStageId === 1 && !order.prontosoftOrderNumber.trim()
                ? 'Informe o número do pedido na Prontosoft no checklist.'
                : order.currentStageId === 2 && !order.invoiceAttachment
                  ? 'Anexe a Nota Fiscal.'
                  : order.currentStageId === 3 && !order.trackingCode.trim()
                    ? 'Informe o código de rastreio.'
                    : 'Checklist obrigatório incompleto.',
          }
        }

        const shouldDebit =
          order.currentStageId === 3 && Boolean(debitStock)
        const qty = order.deviceQuantity ?? 1

        if (shouldDebit) {
          const debitResult = useStockStore
            .getState()
            .tryDebitForOrder(order.product, qty)
          if (!debitResult.ok) {
            return {
              ok: false,
              error:
                debitResult.error ??
                'Estoque insuficiente para concluir a baixa.',
            }
          }
        }

        try {
          let { updatedOrder } = completeStage({
            order,
            operatorId: user.name,
            notes,
          })

          if (shouldDebit) {
            updatedOrder = recordStockDebitHistory({
              order: updatedOrder,
              quantity: qty,
              operatorId: user.name,
            })
          }

          const orders = [...state.orders]
          orders[idx] = updatedOrder
          set({ orders })
          persistOrderRemote(updatedOrder)

          if (updatedOrder.completedAt) {
            void saveFinishedOrder(updatedOrder).then((result) => {
              if (result.ok) {
                set({ serverOnline: true })
              }
            })
          }

          return { ok: true }
        } catch (e) {
          if (shouldDebit) {
            useStockStore.getState().addStock(order.product, qty)
          }
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

        void deleteOrderOnServer(
          orderId,
          adminRecord.login,
          adminRecord.password
        )

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
        refreshOrders(get().orders).filter((o) => !o.completedAt || o.currentStageId === 7),
      getFinishedOrders: () =>
        get().orders.filter((o) => Boolean(o.completedAt)),
    }),
    {
      name: 'orders-workflow-v6',
      partialize: (state) => ({
        orders: state.orders,
        seeded: state.seeded,
        deletedFinishedOrderIds: state.deletedFinishedOrderIds,
        lastAutoSyncAt: state.lastAutoSyncAt,
      }),
    }
  )
)
