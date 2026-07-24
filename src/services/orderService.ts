import { OPERADOR_FICTICIO } from '@/constants/users'
import {
  CURRENT_WORKFLOW_VERSION,
  getStagesForProduct,
  WORKFLOW_STAGES,
} from '@/constants/workflowStages'
import type {
  ChecklistItem,
  Order,
  OperatorId,
  ProductType,
  StageProgress,
  WorkflowStageId,
} from '@/types/workflow'

function buildChecklistItems(stageId: WorkflowStageId): ChecklistItem[] {
  return WORKFLOW_STAGES[stageId].checklistTemplate.map((t) => ({
    ...t,
    checked: false,
  }))
}

function buildStageProgress(stageId: WorkflowStageId): StageProgress {
  return {
    stageId,
    startedAt: null,
    finishedAt: null,
    responsible: null,
    observations: '',
    checklist: buildChecklistItems(stageId),
    scheduledFor: null,
  }
}

export type CreateOrderInput = {
  number: string
  client: string
  cpf: string
  email: string
  phone: string
  product: ProductType
  observations: string
  deviceQuantity: number
  prontosoftOrderNumber?: string
  operatorId?: OperatorId
}

export function createOrder({
  number,
  client,
  cpf,
  email,
  phone,
  product,
  observations,
  deviceQuantity,
  prontosoftOrderNumber = '',
  operatorId = OPERADOR_FICTICIO,
}: CreateOrderInput): Order {
  const iso = new Date().toISOString()
  const startStageId = 1 as WorkflowStageId
  const stageLabel = WORKFLOW_STAGES[startStageId].title
  const stageIds = getStagesForProduct(product)

  const stages = stageIds.reduce(
    (acc, stageId) => {
      acc[stageId] = buildStageProgress(stageId)
      return acc
    },
    {} as Order['stages']
  )

  stages[startStageId] = {
    ...stages[startStageId]!,
    startedAt: iso,
    responsible: operatorId,
    checklist: stages[startStageId]!.checklist.map((item) =>
      item.id === 'prontosoft' && prontosoftOrderNumber.trim()
        ? { ...item, checked: true }
        : item
    ),
  }

  const qty = Math.max(1, Math.floor(Number(deviceQuantity) || 1))

  const order: Order = {
    id: crypto.randomUUID(),
    number,
    client,
    cpf,
    email,
    phone,
    product,
    observations,
    deviceQuantity: qty,
    prontosoftOrderNumber: prontosoftOrderNumber.trim(),
    trackingCode: '',
    imeis: '',
    tags: '',
    invoiceAttachment: null,
    lastActivityAt: iso,
    workflowVersion: CURRENT_WORKFLOW_VERSION,
    createdAt: iso,
    currentStageId: startStageId,
    completedAt: null,
    renovacaoCompletedAt: null,
    currentResponsible: operatorId,
    status: 'Pendentes',
    stages,
    reminders: [],
    history: [
      {
        id: crypto.randomUUID(),
        orderId: '',
        type: 'created',
        stageId: startStageId,
        stageLabel,
        occurredAt: iso,
        responsible: operatorId,
        message: `Pedido ${number} criado (${qty} aparelho${qty > 1 ? 's' : ''}).`,
        notes: '',
      },
      {
        id: crypto.randomUUID(),
        orderId: '',
        type: 'started',
        stageId: startStageId,
        stageLabel,
        occurredAt: iso,
        responsible: operatorId,
        message: `${operatorId} iniciou ${stageLabel}.`,
        notes: '',
      },
    ],
  }

  order.history = order.history.map((e) => ({ ...e, orderId: order.id }))

  return order
}
