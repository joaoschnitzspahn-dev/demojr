import { OPERADOR_FICTICIO } from '@/constants/users'
import { WORKFLOW_STAGE_ORDER, WORKFLOW_STAGES } from '@/constants/workflowStages'
import type {
  ChecklistItem,
  Order,
  OperatorId,
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
  }
}

export type CreateOrderInput = {
  number: string
  client: string
  description: string
  observations: string
  operatorId?: OperatorId
}

export function createOrder({
  number,
  client,
  description,
  observations,
  operatorId = OPERADOR_FICTICIO,
}: CreateOrderInput): Order {
  const iso = new Date().toISOString()
  const startStageId = 1 as WorkflowStageId
  const stageLabel = WORKFLOW_STAGES[startStageId].title

  const stages = WORKFLOW_STAGE_ORDER.reduce(
    (acc, stageId) => {
      acc[stageId] = buildStageProgress(stageId)
      return acc
    },
    {} as Order['stages']
  )

  stages[startStageId] = {
    ...stages[startStageId],
    startedAt: iso,
    responsible: operatorId,
  }

  const order: Order = {
    id: crypto.randomUUID(),
    number,
    client,
    description,
    observations,
    createdAt: iso,
    currentStageId: startStageId,
    completedAt: null,
    currentResponsible: operatorId,
    status: 'Pendentes',
    stages,
    history: [
      {
        id: crypto.randomUUID(),
        orderId: '', // preenchido abaixo
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
