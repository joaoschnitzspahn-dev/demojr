import { OPERADOR_FICTICIO } from '@/constants/users'
import { getStagesForProduct, WORKFLOW_STAGES } from '@/constants/workflowStages'
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
  }

  const order: Order = {
    id: crypto.randomUUID(),
    number,
    client,
    cpf,
    email,
    phone,
    product,
    observations,
    prontosoftOrderNumber: prontosoftOrderNumber.trim(),
    trackingCode: '',
    imeis: '',
    tags: '',
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
        message: `Pedido ${number} criado.`,
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
