import {
  getStageTitle,
  WORKFLOW_STAGE_ORDER,
  WORKFLOW_STAGES,
} from '@/constants/workflowStages'
import { OPERADOR_FICTICIO } from '@/constants/users'
import type {
  ChecklistItem,
  Order,
  OrderHistoryEvent,
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

export function getRequiredChecklistItems(stage: { checklist: ChecklistItem[] }) {
  return stage.checklist.filter((i) => i.required)
}

export function isChecklistComplete(
  stageProgress: Order['stages'][WorkflowStageId]
) {
  const requiredItems = getRequiredChecklistItems(stageProgress)
  return requiredItems.every((i) => i.checked)
}

/** Estado da etapa no fluxo: locked | active | completed */
export function getStageState(
  order: Order,
  stageId: WorkflowStageId
): StageState {
  const stage = order.stages[stageId]
  if (stage.finishedAt) return 'completed'
  if (stageId === order.currentStageId && !order.completedAt) return 'active'
  if (order.completedAt && stageId === 8 && stage.finishedAt) return 'completed'
  return 'locked'
}

export function isStageEditable(order: Order, stageId: WorkflowStageId) {
  return getStageState(order, stageId) === 'active'
}

export function getCanCompleteStage(order: Order, stageId: WorkflowStageId) {
  if (!isStageEditable(order, stageId)) return false
  return isChecklistComplete(order.stages[stageId])
}

/** Alias legado para compatibilidade com a store. */
export const getCanAdvanceStage = getCanCompleteStage

export function getOrderStatus(
  order: Order
): 'Pendentes' | 'Em Andamento' | 'Concluídos' {
  if (order.completedAt) return 'Concluídos'
  if (order.currentStageId === 1) return 'Pendentes'
  return 'Em Andamento'
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

  if (getStageState(order, stageId) !== 'active') {
    throw new WorkflowError('Somente a etapa ativa pode ser concluída.')
  }

  if (stageProgress.finishedAt) {
    throw new WorkflowError('Esta etapa já foi concluída e está bloqueada.')
  }

  if (!isChecklistComplete(stageProgress)) {
    throw new WorkflowError(
      'Checklist obrigatório incompleto. Não é possível concluir a etapa.'
    )
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
    history: [...order.history, completedEvent],
    stages: { ...order.stages },
  }

  updatedOrder.stages[stageId] = {
    ...stageProgress,
    finishedAt: occurredAt,
    responsible: operatorId,
    observations: notes.trim() || stageProgress.observations,
  }

  // Etapa 8: pedido concluído — sem próxima etapa
  if (stageId === 8) {
    updatedOrder.completedAt = occurredAt
    updatedOrder.currentStageId = 8
    updatedOrder.status = 'Concluídos'
    return { updatedOrder, events }
  }

  const nextStageId = (stageId + 1) as WorkflowStageId
  const nextTitle = getStageTitle(nextStageId)
  const nextStageProgress = updatedOrder.stages[nextStageId]

  const releasedEvent = createHistoryEvent({
    orderId: order.id,
    type: 'released',
    stageId: nextStageId,
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
    stageId: nextStageId,
    stageLabel: nextTitle,
    occurredAt,
    responsible: operatorId,
    message: `${operatorId} iniciou ${nextTitle}.`,
    notes: '',
  })
  events.push(startedEvent)

  updatedOrder.stages[nextStageId] = {
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

  updatedOrder.currentStageId = nextStageId
  updatedOrder.completedAt = null
  updatedOrder.status = 'Em Andamento'
  updatedOrder.history = [...updatedOrder.history, releasedEvent, startedEvent]

  // Garante estrutura completa das 8 etapas
  for (const sid of WORKFLOW_STAGE_ORDER) {
    if (!updatedOrder.stages[sid]) {
      updatedOrder.stages[sid] = {
        stageId: sid,
        startedAt: null,
        finishedAt: null,
        responsible: null,
        observations: '',
        checklist: WORKFLOW_STAGES[sid].checklistTemplate.map((t) => ({
          ...t,
          checked: false,
        })),
      }
    }
  }

  return { updatedOrder, events }
}

/** Alias legado. */
export const advanceStage = completeStage

/**
 * Só permite alterar checklist da etapa ATIVA.
 * Etapas concluídas e bloqueadas são imutáveis.
 */
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
      'Não é possível editar etapas bloqueadas ou já concluídas.'
    )
  }

  const stageProgress = order.stages[stageId]
  const nextChecklist = stageProgress.checklist.map((item) =>
    item.id === itemId ? { ...item, checked } : item
  )

  return {
    ...order,
    stages: {
      ...order.stages,
      [stageId]: {
        ...stageProgress,
        checklist: nextChecklist,
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
      'Não é possível editar observações de etapas bloqueadas ou concluídas.'
    )
  }

  return {
    ...order,
    stages: {
      ...order.stages,
      [stageId]: {
        ...order.stages[stageId],
        observations,
      },
    },
  }
}
