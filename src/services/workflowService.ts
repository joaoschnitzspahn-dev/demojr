import {
  getStageTitle,
  getStagesForProduct,
} from '@/constants/workflowStages'
import { requiresRenovacao } from '@/constants/products'
import { OPERADOR_FICTICIO } from '@/constants/users'
import type {
  ChecklistItem,
  Order,
  OrderHistoryEvent,
  OrderReminder,
  OperatorId,
  StageState,
  WorkflowStageId,
} from '@/types/workflow'

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'
  }
}

function createHistoryEvent(
  partial: Omit<OrderHistoryEvent, 'id'>
): OrderHistoryEvent {
  return { id: crypto.randomUUID(), ...partial }
}

function addDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function addMonths(iso: string, months: number) {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

export function getRequiredChecklistItems(stage: { checklist: ChecklistItem[] }) {
  return stage.checklist.filter((i) => i.required)
}

export function isChecklistComplete(
  stageProgress: NonNullable<Order['stages'][WorkflowStageId]>
) {
  const requiredItems = getRequiredChecklistItems(stageProgress)
  return requiredItems.every((i) => i.checked)
}

export function ensureReminderStatuses(order: Order, now = new Date()): Order {
  const nowMs = now.getTime()
  let changed = false
  const reminders = order.reminders.map((r) => {
    if (r.status === 'pending' && new Date(r.dueAt).getTime() <= nowMs) {
      changed = true
      return { ...r, status: 'due' as const }
    }
    return r
  })
  if (!changed) return order
  return { ...order, reminders }
}

/** Estado do processo no fluxo. */
export function getStageState(
  order: Order,
  stageId: WorkflowStageId
): StageState {
  const stage = order.stages[stageId]
  if (!stage) return 'locked'
  if (stage.finishedAt) return 'completed'

  if (stageId === 6) {
    if (
      stage.scheduledFor &&
      new Date(stage.scheduledFor).getTime() > Date.now()
    ) {
      return 'scheduled'
    }
    if (order.currentStageId === 6 && !order.renovacaoCompletedAt) {
      return 'active'
    }
    if (
      order.completedAt &&
      stage.scheduledFor &&
      new Date(stage.scheduledFor).getTime() <= Date.now() &&
      !stage.finishedAt
    ) {
      return 'active'
    }
    return 'locked'
  }

  if (stageId === order.currentStageId && !order.completedAt) return 'active'
  return 'locked'
}

export function isStageEditable(order: Order, stageId: WorkflowStageId) {
  return getStageState(order, stageId) === 'active'
}

export function getCanCompleteStage(order: Order, stageId: WorkflowStageId) {
  if (!isStageEditable(order, stageId)) return false
  const stage = order.stages[stageId]
  if (!stage) return false
  if (stageId === 2 && !order.trackingCode.trim()) return false
  return isChecklistComplete(stage)
}

export const getCanAdvanceStage = getCanCompleteStage

export function getOrderStatus(
  order: Order
): 'Pendentes' | 'Em Andamento' | 'Concluídos' {
  if (order.completedAt) return 'Concluídos'
  if (order.currentStageId === 1) return 'Pendentes'
  return 'Em Andamento'
}

export function getDueReminders(order: Order): OrderReminder[] {
  return order.reminders.filter((r) => r.status === 'due')
}

/** Ativa Renovação quando a data agendada chega (pedido já finalizado). */
export function activateRenovacaoIfDue(order: Order): Order {
  if (!requiresRenovacao(order.product)) return order
  if (order.renovacaoCompletedAt) return order
  if (!order.completedAt) return order

  const stage = order.stages[6]
  if (!stage || stage.finishedAt || !stage.scheduledFor) return order
  if (new Date(stage.scheduledFor).getTime() > Date.now()) return order
  if (stage.startedAt && order.currentStageId === 6) return order

  const occurredAt = new Date().toISOString()
  const stageLabel = getStageTitle(6)

  const startedEvent = createHistoryEvent({
    orderId: order.id,
    type: 'started',
    stageId: 6,
    stageLabel,
    occurredAt,
    responsible: order.currentResponsible,
    message: 'Renovação liberada automaticamente (data agendada atingida).',
    notes: '',
  })

  return {
    ...order,
    currentStageId: 6,
    stages: {
      ...order.stages,
      6: {
        ...stage,
        startedAt: stage.startedAt ?? occurredAt,
        responsible: order.currentResponsible,
      },
    },
    reminders: order.reminders.map((r) =>
      r.type === 'renovacao_5m' && r.status !== 'done'
        ? { ...r, status: 'due' as const }
        : r
    ),
    history: [...order.history, startedEvent],
  }
}

export function completeStage({
  order,
  operatorId = OPERADOR_FICTICIO,
  notes,
}: {
  order: Order
  operatorId?: OperatorId
  notes: string
}): { updatedOrder: Order; events: OrderHistoryEvent[] } {
  const occurredAt = new Date().toISOString()
  const stageId = order.currentStageId
  const stageProgress = order.stages[stageId]
  const stageLabel = getStageTitle(stageId)

  if (!stageProgress) {
    throw new WorkflowError('Processo não encontrado neste pedido.')
  }

  if (getStageState(order, stageId) !== 'active') {
    throw new WorkflowError('Somente o processo ativo pode ser concluído.')
  }

  if (stageProgress.finishedAt) {
    throw new WorkflowError('Este processo já foi concluído e está bloqueado.')
  }

  if (!isChecklistComplete(stageProgress)) {
    throw new WorkflowError(
      'Checklist obrigatório incompleto. Não é possível concluir o processo.'
    )
  }

  if (stageId === 2 && !order.trackingCode.trim()) {
    throw new WorkflowError('Informe o código de rastreio antes de concluir.')
  }

  const events: OrderHistoryEvent[] = []

  const completedEvent = createHistoryEvent({
    orderId: order.id,
    type: 'completed',
    stageId,
    stageLabel,
    occurredAt,
    responsible: operatorId,
    message: `${operatorId} concluiu ${stageLabel}.`,
    notes: notes.trim(),
  })
  events.push(completedEvent)

  const updatedOrder: Order = {
    ...order,
    currentResponsible: operatorId,
    stages: { ...order.stages },
    reminders: [...order.reminders],
    history: [...order.history],
  }

  updatedOrder.stages[stageId] = {
    ...stageProgress,
    finishedAt: occurredAt,
    responsible: operatorId,
    observations: notes.trim() || stageProgress.observations,
  }
  updatedOrder.history.push(completedEvent)

  // —— Renovação ——
  if (stageId === 6) {
    updatedOrder.renovacaoCompletedAt = occurredAt
    updatedOrder.reminders = updatedOrder.reminders.map((r) =>
      r.type === 'renovacao_5m' ? { ...r, status: 'done' as const } : r
    )
    const doneEvent = createHistoryEvent({
      orderId: order.id,
      type: 'completed',
      stageId: 6,
      stageLabel,
      occurredAt,
      responsible: operatorId,
      message: 'Processo de Renovação encerrado.',
      notes: '',
    })
    events.push(doneEvent)
    updatedOrder.history.push(doneEvent)
    return { updatedOrder, events }
  }

  // —— Pós-venda → Pedidos Finalizados ——
  if (stageId === 5) {
    updatedOrder.completedAt = occurredAt
    updatedOrder.status = 'Concluídos'
    updatedOrder.reminders = updatedOrder.reminders.map((r) =>
      r.type === 'pos_venda_7d' ? { ...r, status: 'done' as const } : r
    )

    const finalizedEvent = createHistoryEvent({
      orderId: order.id,
      type: 'completed',
      stageId: 5,
      stageLabel,
      occurredAt,
      responsible: operatorId,
      message: 'Pedido movido para Pedidos Finalizados.',
      notes: '',
    })
    events.push(finalizedEvent)
    updatedOrder.history.push(finalizedEvent)
    return { updatedOrder, events }
  }

  // —— Após Confirmação + Mini: agenda Renovação ——
  if (stageId === 4 && requiresRenovacao(order.product)) {
    const dueAt = addMonths(occurredAt, 5)
    const renovacaoStage = updatedOrder.stages[6]
    if (renovacaoStage) {
      updatedOrder.stages[6] = {
        ...renovacaoStage,
        scheduledFor: dueAt,
      }
    }

    updatedOrder.reminders.push({
      id: crypto.randomUUID(),
      type: 'renovacao_5m',
      stageId: 6,
      dueAt,
      status: 'pending',
      label: 'Renovação Mini Rastreador (5 meses)',
    })

    const scheduledEvent = createHistoryEvent({
      orderId: order.id,
      type: 'scheduled',
      stageId: 6,
      stageLabel: getStageTitle(6),
      occurredAt,
      responsible: operatorId,
      message: `Renovação agendada para ${new Date(dueAt).toLocaleDateString('pt-BR')}.`,
      notes: '',
    })
    events.push(scheduledEvent)
    updatedOrder.history.push(scheduledEvent)
  }

  // Fluxo operacional sequencial: 1 → 2 → 3 → 4 → 5
  const operationalNext = (stageId + 1) as WorkflowStageId
  const nextTitle = getStageTitle(operationalNext)
  const nextStageProgress = updatedOrder.stages[operationalNext]

  if (!nextStageProgress) {
    throw new WorkflowError('Próximo processo não encontrado.')
  }

  const releasedEvent = createHistoryEvent({
    orderId: order.id,
    type: 'released',
    stageId: operationalNext,
    stageLabel: nextTitle,
    occurredAt,
    responsible: operatorId,
    message: `Pedido liberado para ${nextTitle}.`,
    notes: '',
  })
  events.push(releasedEvent)

  const startedEvent = createHistoryEvent({
    orderId: order.id,
    type: 'started',
    stageId: operationalNext,
    stageLabel: nextTitle,
    occurredAt,
    responsible: operatorId,
    message: `${operatorId} iniciou ${nextTitle}.`,
    notes: '',
  })
  events.push(startedEvent)

  updatedOrder.stages[operationalNext] = {
    ...nextStageProgress,
    startedAt: occurredAt,
    responsible: operatorId,
    finishedAt: null,
    observations: '',
    checklist: nextStageProgress.checklist.map((i) => ({
      ...i,
      checked: false,
    })),
  }

  if (operationalNext === 5) {
    const dueAt = addDays(occurredAt, 7)
    updatedOrder.reminders.push({
      id: crypto.randomUUID(),
      type: 'pos_venda_7d',
      stageId: 5,
      dueAt,
      status: 'pending',
      label: 'Follow-up pós-venda (7 dias)',
    })

    const reminderEvent = createHistoryEvent({
      orderId: order.id,
      type: 'reminder',
      stageId: 5,
      stageLabel: nextTitle,
      occurredAt,
      responsible: operatorId,
      message: `Lembrete de pós-venda criado para ${new Date(dueAt).toLocaleDateString('pt-BR')}.`,
      notes: '',
    })
    events.push(reminderEvent)
    updatedOrder.history.push(reminderEvent)
  }

  updatedOrder.history.push(releasedEvent, startedEvent)
  updatedOrder.currentStageId = operationalNext
  updatedOrder.completedAt = null
  updatedOrder.status = 'Em Andamento'

  return { updatedOrder, events }
}

export const advanceStage = completeStage

export function toggleChecklistItem({
  order,
  stageId,
  itemId,
  checked,
}: {
  order: Order
  stageId: WorkflowStageId
  itemId: string
  checked: boolean
}): Order {
  if (!isStageEditable(order, stageId)) {
    throw new WorkflowError(
      'Não é possível editar processos bloqueados ou já concluídos.'
    )
  }

  const stageProgress = order.stages[stageId]
  if (!stageProgress) {
    throw new WorkflowError('Processo não encontrado.')
  }

  return {
    ...order,
    stages: {
      ...order.stages,
      [stageId]: {
        ...stageProgress,
        checklist: stageProgress.checklist.map((item) =>
          item.id === itemId ? { ...item, checked } : item
        ),
      },
    },
  }
}

export function updateStageObservations({
  order,
  stageId,
  observations,
}: {
  order: Order
  stageId: WorkflowStageId
  observations: string
}): Order {
  if (!isStageEditable(order, stageId)) {
    throw new WorkflowError(
      'Não é possível editar observações de processos bloqueados ou concluídos.'
    )
  }

  const stage = order.stages[stageId]
  if (!stage) throw new WorkflowError('Processo não encontrado.')

  return {
    ...order,
    stages: {
      ...order.stages,
      [stageId]: { ...stage, observations },
    },
  }
}

export function updateOrderShippingFields({
  order,
  trackingCode,
  imeis,
  tags,
  operatorId = OPERADOR_FICTICIO,
}: {
  order: Order
  trackingCode?: string
  imeis?: string
  tags?: string
  operatorId?: OperatorId
}): Order {
  if (getStageState(order, 2) !== 'active') {
    throw new WorkflowError(
      'Código de rastreio e IMEIs só podem ser editados na Expedição ativa.'
    )
  }

  const changes: string[] = []
  const next: Order = { ...order }

  if (trackingCode !== undefined && trackingCode !== order.trackingCode) {
    next.trackingCode = trackingCode
    changes.push(`código de rastreio → ${trackingCode || '(vazio)'}`)
  }
  if (imeis !== undefined && imeis !== order.imeis) {
    next.imeis = imeis
    changes.push('IMEIs atualizados')
  }
  if (tags !== undefined && tags !== order.tags) {
    next.tags = tags
    changes.push('Tags atualizadas')
  }

  if (changes.length === 0) return order

  const event = createHistoryEvent({
    orderId: order.id,
    type: 'field_updated',
    stageId: 2,
    stageLabel: getStageTitle(2),
    occurredAt: new Date().toISOString(),
    responsible: operatorId,
    message: `${operatorId} atualizou: ${changes.join(', ')}.`,
    notes: '',
  })

  return { ...next, history: [...order.history, event] }
}

export function getPipelineStages(order: Order): WorkflowStageId[] {
  return getStagesForProduct(order.product)
}

/** Pedidos ativos no Kanban (exclui finalizados, exceto Renovação ativa). */
export function isActiveBoardOrder(order: Order): boolean {
  if (!order.completedAt) return true
  if (
    order.currentStageId === 6 &&
    !order.renovacaoCompletedAt &&
    getStageState(order, 6) === 'active'
  ) {
    return true
  }
  return false
}
