export type WorkflowStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type OperatorId = string

export type UserRole = 'admin' | 'operator'

export type AppUser = {
  id: OperatorId
  login: string
  password: string
  name: string
  role: UserRole
  /** Etapas que o operador pode executar. Admin ignora (acesso total). */
  assignedStages: WorkflowStageId[]
  active: boolean
  createdAt: string
}

export type ChecklistItem = {
  id: string
  label: string
  required: boolean
  checked: boolean
}

export type StageState = 'locked' | 'active' | 'completed'

export type StageProgress = {
  stageId: WorkflowStageId
  startedAt: string | null
  finishedAt: string | null
  responsible: OperatorId | null
  observations: string
  checklist: ChecklistItem[]
}

export type HistoryEventType = 'started' | 'completed' | 'released' | 'created'

export type OrderHistoryEvent = {
  id: string
  orderId: string
  type: HistoryEventType
  stageId: WorkflowStageId | null
  stageLabel: string | null
  occurredAt: string
  responsible: OperatorId
  message: string
  notes: string
}

export type OrderStatus = 'Pendentes' | 'Em Andamento' | 'Concluídos'

export type Order = {
  id: string
  number: string
  client: string
  createdAt: string
  description: string
  observations: string

  currentStageId: WorkflowStageId
  completedAt: string | null
  currentResponsible: OperatorId
  status: OrderStatus

  stages: Record<WorkflowStageId, StageProgress>
  history: OrderHistoryEvent[]
}

/** @deprecated use AppUser — mantido só se algum import residual existir */
export type User = AppUser
