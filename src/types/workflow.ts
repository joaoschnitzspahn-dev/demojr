/** Processos do fluxo operacional (1–5 sempre; 6 só Mini Rastreador). */
export type WorkflowStageId = 1 | 2 | 3 | 4 | 5 | 6

export type ProductType = 'mini_rastreador' | 'lv12_4g'

export type OperatorId = string

export type UserRole = 'admin' | 'operator'

export type AppUser = {
  id: OperatorId
  login: string
  password: string
  name: string
  role: UserRole
  /** Processos que o operador pode executar. Admin ignora (acesso total). */
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

export type StageState = 'locked' | 'active' | 'completed' | 'scheduled'

export type StageProgress = {
  stageId: WorkflowStageId
  startedAt: string | null
  finishedAt: string | null
  responsible: OperatorId | null
  observations: string
  checklist: ChecklistItem[]
  /** Data em que o processo agendado fica disponível (ex.: Renovação). */
  scheduledFor: string | null
}

export type HistoryEventType =
  | 'started'
  | 'completed'
  | 'released'
  | 'created'
  | 'scheduled'
  | 'reminder'
  | 'field_updated'

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

export type OrderReminder = {
  id: string
  type: 'pos_venda_7d' | 'renovacao_5m'
  stageId: WorkflowStageId
  dueAt: string
  status: 'pending' | 'due' | 'done'
  label: string
}

export type Order = {
  id: string
  number: string
  client: string
  cpf: string
  email: string
  phone: string
  product: ProductType
  createdAt: string
  observations: string

  /** Código de rastreio (preenchido na Expedição). */
  trackingCode: string
  /** IMEIs informados na Expedição — preparado para importação Excel. */
  imeis: string
  /** Tags catalogadas. */
  tags: string

  currentStageId: WorkflowStageId
  completedAt: string | null
  /** Conclusão do processo de Renovação (Mini Rastreador). */
  renovacaoCompletedAt: string | null
  currentResponsible: OperatorId
  status: OrderStatus

  stages: Partial<Record<WorkflowStageId, StageProgress>>
  reminders: OrderReminder[]
  history: OrderHistoryEvent[]
}

/** @deprecated use AppUser */
export type User = AppUser
