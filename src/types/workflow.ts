/** Processos do fluxo (1–6 sempre; 7 só Mini Rastreador). */
export type WorkflowStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7

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
  | 'attachment_uploaded'
  | 'stock_debit'

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

/** Anexo da Nota Fiscal (upload no processo 2). */
export type InvoiceAttachment = {
  fileName: string
  uploadedAt: string
  uploadedBy: OperatorId
  /** URL relativa para download/visualização. */
  url: string
  storageKey: string
  mimeType: string
  size: number
}

export type OrderAlertType = 'stalled_15m'

export type OrderAlert = {
  id: string
  orderId: string
  orderNumber: string
  client: string
  type: OrderAlertType
  stageId: WorkflowStageId
  stageLabel: string
  message: string
  createdAt: string
  minutesIdle: number
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

  /** Quantidade de aparelhos (obrigatória no cadastro). */
  deviceQuantity: number

  /** Número do pedido no sistema Prontosoft. */
  prontosoftOrderNumber: string

  /** Código de rastreio (preenchido na Expedição). */
  trackingCode: string
  /** IMEIs informados na Expedição. */
  imeis: string
  /** Tags catalogadas. */
  tags: string

  /** Nota Fiscal anexada no processo 2. */
  invoiceAttachment: InvoiceAttachment | null

  /** Última movimentação — usado para alerta de pedido parado. */
  lastActivityAt: string

  /** Versão do mapa de etapas (migração). */
  workflowVersion?: number

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
