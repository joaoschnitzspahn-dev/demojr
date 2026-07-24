import {
  CURRENT_WORKFLOW_VERSION,
  getStageTitle,
  getStagesForProduct,
  WORKFLOW_STAGES,
} from '@/constants/workflowStages'
import { STALLED_ORDER_MS } from '@/constants/alerts'
import { PRODUCT_LABELS, requiresRenovacao } from '@/constants/products'
import { OPERADOR_FICTICIO } from '@/constants/users'
import type {
  ChecklistItem,
  InvoiceAttachment,
  Order,
  OrderAlert,
  OrderHistoryEvent,
  OperatorId,
  StageProgress,
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

function buildEmptyStage(stageId: WorkflowStageId): StageProgress {
  return {
    stageId,
    startedAt: null,
    finishedAt: null,
    responsible: null,
    observations: '',
    checklist: WORKFLOW_STAGES[stageId].checklistTemplate.map((t) => ({
      ...t,
      checked: false,
    })),
    scheduledFor: null,
  }
}

function touchActivity(order: Order, at = new Date().toISOString()): Order {
  return { ...order, lastActivityAt: at }
}

/**
 * Migra pedidos do workflow v1 (6 etapas) → v2 (7 etapas com NF/Etiqueta).
 * Mapa antigo: 1 Cadastro, 2 Exp, 3 Acomp, 4 Receb, 5 Pós, 6 Renov
 * Mapa novo:   1 Cadastro, 2 NF, 3 Exp, 4 Acomp, 5 Receb, 6 Pós, 7 Renov
 */
export function migrateWorkflowOrder(order: Order): Order {
  const version = order.workflowVersion ?? 1
  if (version >= CURRENT_WORKFLOW_VERSION) {
    return {
      ...order,
      deviceQuantity: order.deviceQuantity ?? 1,
      invoiceAttachment: order.invoiceAttachment ?? null,
      lastActivityAt:
        order.lastActivityAt ??
        order.history[order.history.length - 1]?.occurredAt ??
        order.createdAt,
      workflowVersion: CURRENT_WORKFLOW_VERSION,
    }
  }

  const oldStages = order.stages as Partial<
    Record<number, StageProgress | undefined>
  >

  const mapOldToNew = (oldId: number): WorkflowStageId | null => {
    if (oldId === 1) return 1
    if (oldId === 2) return 3
    if (oldId === 3) return 4
    if (oldId === 4) return 5
    if (oldId === 5) return 6
    if (oldId === 6) return 7
    return null
  }

  const stages: Order['stages'] = {}
  for (const [key, stage] of Object.entries(oldStages)) {
    const oldId = Number(key)
    const newId = mapOldToNew(oldId)
    if (!newId || !stage) continue
    stages[newId] = { ...stage, stageId: newId }
  }

  // Inserir processo NF se ainda não existe
  if (!stages[2]) {
    const cadastroDone = Boolean(stages[1]?.finishedAt)
    stages[2] = {
      ...buildEmptyStage(2),
      // Se já passou do cadastro no fluxo antigo, NF fica concluída (bypass histórico)
      ...(cadastroDone && stages[3]
        ? {
            startedAt: stages[1]?.finishedAt ?? order.createdAt,
            finishedAt: stages[1]?.finishedAt ?? order.createdAt,
            responsible: stages[1]?.responsible ?? order.currentResponsible,
            checklist: WORKFLOW_STAGES[2].checklistTemplate.map((t) => ({
              ...t,
              checked: true,
            })),
          }
        : {}),
    }
  }

  for (const id of getStagesForProduct(order.product)) {
    if (!stages[id]) stages[id] = buildEmptyStage(id)
  }

  const oldCurrent = order.currentStageId as number
  let currentStageId = (mapOldToNew(oldCurrent) ?? 1) as WorkflowStageId

  // Se estava no Cadastro ativo, permanece; se já tinha avançado, mapeia.
  // Pedidos no meio do fluxo antigo não voltam para NF se já tinham expedição.
  if (oldCurrent === 1 && !stages[1]?.finishedAt) {
    currentStageId = 1
  }

  const reminders = order.reminders.map((r) => {
    const mapped = mapOldToNew(r.stageId as number)
    return mapped ? { ...r, stageId: mapped } : r
  })

  const history = order.history.map((h) => {
    if (h.stageId == null) return h
    const mapped = mapOldToNew(h.stageId as number)
    return mapped
      ? { ...h, stageId: mapped, stageLabel: getStageTitle(mapped) }
      : h
  })

  return {
    ...order,
    deviceQuantity: order.deviceQuantity ?? 1,
    invoiceAttachment: order.invoiceAttachment ?? null,
    lastActivityAt:
      order.lastActivityAt ??
      order.history[order.history.length - 1]?.occurredAt ??
      order.createdAt,
    workflowVersion: CURRENT_WORKFLOW_VERSION,
    currentStageId,
    stages,
    reminders,
    history,
  }
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

/** Alinha checklists dos pedidos ao template atual (migração suave). */
export function syncChecklistsWithTemplates(order: Order): Order {
  const stageIds = getStagesForProduct(order.product)
  let changed = false
  const stages = { ...order.stages }

  for (const stageId of stageIds) {
    let stage = stages[stageId]
    if (!stage) {
      changed = true
      stages[stageId] = buildEmptyStage(stageId)
      stage = stages[stageId]!
    }
    const template = WORKFLOW_STAGES[stageId].checklistTemplate
    const byId = new Map(stage.checklist.map((i) => [i.id, i]))
    const nextChecklist = template.map((t) => {
      const existing = byId.get(t.id)
      return {
        id: t.id,
        label: t.label,
        required: t.required,
        checked: existing?.checked ?? false,
      }
    })

    const same =
      nextChecklist.length === stage.checklist.length &&
      nextChecklist.every(
        (item, idx) =>
          item.id === stage.checklist[idx]?.id &&
          item.required === stage.checklist[idx]?.required &&
          item.label === stage.checklist[idx]?.label
      )

    if (!same) {
      changed = true
      stages[stageId] = { ...stage, checklist: nextChecklist }
    }
  }

  if (!changed) return order
  return { ...order, stages }
}

/** Estado do processo no fluxo. */
export function getStageState(
  order: Order,
  stageId: WorkflowStageId
): StageState {
  const stage = order.stages[stageId]
  if (!stage) return 'locked'
  if (stage.finishedAt) return 'completed'

  // Renovação (agendada)
  if (stageId === 7) {
    if (
      stage.scheduledFor &&
      new Date(stage.scheduledFor).getTime() > Date.now()
    ) {
      return 'scheduled'
    }
    if (order.currentStageId === 7 && !order.renovacaoCompletedAt) {
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
  if (stageId === 1 && !order.prontosoftOrderNumber.trim()) return false
  if (stageId === 2 && !order.invoiceAttachment) return false
  if (stageId === 3 && !order.trackingCode.trim()) return false
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

export function getDueReminders(order: Order) {
  return order.reminders.filter((r) => r.status === 'due')
}

/** Pedidos sem movimentação há mais de 15 minutos. */
export function getStalledOrderAlerts(
  orders: Order[],
  now = Date.now()
): OrderAlert[] {
  const alerts: OrderAlert[] = []

  for (const order of orders) {
    if (order.completedAt && order.currentStageId !== 7) continue
    if (order.renovacaoCompletedAt) continue

    const state = getStageState(order, order.currentStageId)
    if (state !== 'active') continue

    const last =
      order.lastActivityAt ??
      order.history[order.history.length - 1]?.occurredAt ??
      order.createdAt
    const idleMs = now - new Date(last).getTime()
    if (idleMs < STALLED_ORDER_MS) continue

    const minutesIdle = Math.floor(idleMs / 60000)
    alerts.push({
      id: `stalled-${order.id}`,
      orderId: order.id,
      orderNumber: order.number,
      client: order.client,
      type: 'stalled_15m',
      stageId: order.currentStageId,
      stageLabel: getStageTitle(order.currentStageId),
      message: `Pedido parado há ${minutesIdle} min em ${getStageTitle(order.currentStageId)}.`,
      createdAt: new Date(now).toISOString(),
      minutesIdle,
    })
  }

  return alerts.sort((a, b) => b.minutesIdle - a.minutesIdle)
}

/** Ativa Renovação quando a data agendada chega (pedido já finalizado). */
export function activateRenovacaoIfDue(order: Order): Order {
  if (!requiresRenovacao(order.product)) return order
  if (order.renovacaoCompletedAt) return order
  if (!order.completedAt) return order

  const stage = order.stages[7]
  if (!stage || stage.finishedAt || !stage.scheduledFor) return order
  if (new Date(stage.scheduledFor).getTime() > Date.now()) return order
  if (stage.startedAt && order.currentStageId === 7) return order

  const occurredAt = new Date().toISOString()
  const stageLabel = getStageTitle(7)

  const startedEvent = createHistoryEvent({
    orderId: order.id,
    type: 'started',
    stageId: 7,
    stageLabel,
    occurredAt,
    responsible: order.currentResponsible,
    message: 'Renovação liberada automaticamente (data agendada atingida).',
    notes: '',
  })

  return touchActivity({
    ...order,
    currentStageId: 7,
    stages: {
      ...order.stages,
      7: {
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
  }, occurredAt)
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

  if (stageId === 2 && !order.invoiceAttachment) {
    throw new WorkflowError(
      'Anexe a Nota Fiscal antes de concluir este processo.'
    )
  }

  if (stageId === 3 && !order.trackingCode.trim()) {
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
    lastActivityAt: occurredAt,
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
  if (stageId === 7) {
    updatedOrder.renovacaoCompletedAt = occurredAt
    updatedOrder.reminders = updatedOrder.reminders.map((r) =>
      r.type === 'renovacao_5m' ? { ...r, status: 'done' as const } : r
    )
    const doneEvent = createHistoryEvent({
      orderId: order.id,
      type: 'completed',
      stageId: 7,
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
  if (stageId === 6) {
    updatedOrder.completedAt = occurredAt
    updatedOrder.status = 'Concluídos'
    updatedOrder.reminders = updatedOrder.reminders.map((r) =>
      r.type === 'pos_venda_7d' ? { ...r, status: 'done' as const } : r
    )

    const finalizedEvent = createHistoryEvent({
      orderId: order.id,
      type: 'completed',
      stageId: 6,
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
  if (stageId === 5 && requiresRenovacao(order.product)) {
    const dueAt = addMonths(occurredAt, 5)
    const renovacaoStage = updatedOrder.stages[7]
    if (renovacaoStage) {
      updatedOrder.stages[7] = {
        ...renovacaoStage,
        scheduledFor: dueAt,
      }
    }

    updatedOrder.reminders.push({
      id: crypto.randomUUID(),
      type: 'renovacao_5m',
      stageId: 7,
      dueAt,
      status: 'pending',
      label: 'Renovação Mini Rastreador (5 meses)',
    })

    const scheduledEvent = createHistoryEvent({
      orderId: order.id,
      type: 'scheduled',
      stageId: 7,
      stageLabel: getStageTitle(7),
      occurredAt,
      responsible: operatorId,
      message: `Renovação agendada para ${new Date(dueAt).toLocaleDateString('pt-BR')}.`,
      notes: '',
    })
    events.push(scheduledEvent)
    updatedOrder.history.push(scheduledEvent)
  }

  // Fluxo operacional sequencial: 1 → 2 → 3 → 4 → 5 → 6
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

  if (operationalNext === 6) {
    const dueAt = addDays(occurredAt, 7)
    updatedOrder.reminders.push({
      id: crypto.randomUUID(),
      type: 'pos_venda_7d',
      stageId: 6,
      dueAt,
      status: 'pending',
      label: 'Follow-up pós-venda (7 dias)',
    })

    const reminderEvent = createHistoryEvent({
      orderId: order.id,
      type: 'reminder',
      stageId: 6,
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

  return touchActivity({
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
  })
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

  return touchActivity({
    ...order,
    stages: {
      ...order.stages,
      [stageId]: { ...stage, observations },
    },
  })
}

export function updateOrderShippingFields({
  order,
  trackingCode,
  imeis,
  operatorId = OPERADOR_FICTICIO,
}: {
  order: Order
  trackingCode?: string
  imeis?: string
  operatorId?: OperatorId
}): Order {
  if (getStageState(order, 3) !== 'active') {
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

  const stage = next.stages[3]
  if (stage && trackingCode !== undefined) {
    const hasTracking = trackingCode.trim().length > 0
    next.stages = {
      ...next.stages,
      3: {
        ...stage,
        checklist: stage.checklist.map((item) =>
          item.id === 'rastreio' ? { ...item, checked: hasTracking } : item
        ),
      },
    }
  }

  if (changes.length === 0) return next

  const occurredAt = new Date().toISOString()
  const event = createHistoryEvent({
    orderId: order.id,
    type: 'field_updated',
    stageId: 3,
    stageLabel: getStageTitle(3),
    occurredAt,
    responsible: operatorId,
    message: `${operatorId} atualizou: ${changes.join(', ')}.`,
    notes: '',
  })

  return touchActivity(
    { ...next, history: [...order.history, event] },
    occurredAt
  )
}

/** Aplica IMEIs importados de planilha. */
export function applyImeiSpreadsheetImport({
  order,
  imeis,
  fileName,
  operatorId = OPERADOR_FICTICIO,
}: {
  order: Order
  imeis: string[]
  fileName: string
  operatorId?: OperatorId
}): Order {
  if (getStageState(order, 3) !== 'active') {
    throw new WorkflowError(
      'Importação de planilha só é permitida na Expedição ativa.'
    )
  }

  if (imeis.length === 0) {
    throw new WorkflowError('Nenhum IMEI encontrado na planilha.')
  }

  if (!order.stages[3]) {
    throw new WorkflowError('Processo de Expedição não encontrado.')
  }

  const occurredAt = new Date().toISOString()
  const imeiText = imeis.join('\n')
  const event = createHistoryEvent({
    orderId: order.id,
    type: 'field_updated',
    stageId: 3,
    stageLabel: getStageTitle(3),
    occurredAt,
    responsible: operatorId,
    message: `${operatorId} importou ${imeis.length} IMEI(s) da planilha "${fileName}".`,
    notes: '',
  })

  return touchActivity(
    {
      ...order,
      imeis: imeiText,
      history: [...order.history, event],
    },
    occurredAt
  )
}

/** Vincula o nº Prontosoft ao pedido e marca o checklist automaticamente. */
export function updateProntosoftOrderNumber({
  order,
  value,
  operatorId = OPERADOR_FICTICIO,
}: {
  order: Order
  value: string
  operatorId?: OperatorId
}): Order {
  if (!isStageEditable(order, 1)) {
    throw new WorkflowError(
      'O número Prontosoft só pode ser informado no Cadastro do Pedido ativo.'
    )
  }

  const trimmed = value.trim()
  const previous = order.prontosoftOrderNumber.trim()

  const stage = order.stages[1]
  if (!stage) throw new WorkflowError('Processo de Cadastro não encontrado.')

  const nextChecklist = stage.checklist.map((item) =>
    item.id === 'prontosoft'
      ? { ...item, checked: trimmed.length > 0 }
      : item
  )

  const next: Order = {
    ...order,
    prontosoftOrderNumber: value,
    stages: {
      ...order.stages,
      1: { ...stage, checklist: nextChecklist },
    },
  }

  if (trimmed === previous) return next

  const occurredAt = new Date().toISOString()
  const event = createHistoryEvent({
    orderId: order.id,
    type: 'field_updated',
    stageId: 1,
    stageLabel: getStageTitle(1),
    occurredAt,
    responsible: operatorId,
    message: trimmed
      ? `${operatorId} vinculou o pedido Prontosoft ${trimmed} ao cliente ${order.client}.`
      : `${operatorId} removeu o vínculo Prontosoft do pedido.`,
    notes: '',
  })

  return touchActivity(
    { ...next, history: [...order.history, event] },
    occurredAt
  )
}

/** Anexa Nota Fiscal no processo 2 (upload). */
export function attachInvoiceToOrder({
  order,
  attachment,
  operatorId = OPERADOR_FICTICIO,
}: {
  order: Order
  attachment: InvoiceAttachment
  operatorId?: OperatorId
}): Order {
  if (getStageState(order, 2) !== 'active') {
    throw new WorkflowError(
      'A Nota Fiscal só pode ser anexada no processo Nota Fiscal e Etiqueta ativo.'
    )
  }

  const occurredAt = attachment.uploadedAt || new Date().toISOString()
  const event = createHistoryEvent({
    orderId: order.id,
    type: 'attachment_uploaded',
    stageId: 2,
    stageLabel: getStageTitle(2),
    occurredAt,
    responsible: operatorId,
    message: `${operatorId} anexou a Nota Fiscal "${attachment.fileName}".`,
    notes: '',
  })

  return touchActivity(
    {
      ...order,
      invoiceAttachment: attachment,
      history: [...order.history, event],
    },
    occurredAt
  )
}

/** Registra baixa de estoque no histórico do pedido (desacoplado do estoque). */
export function recordStockDebitHistory({
  order,
  quantity,
  operatorId = OPERADOR_FICTICIO,
}: {
  order: Order
  quantity: number
  operatorId?: OperatorId
}): Order {
  const occurredAt = new Date().toISOString()
  const productLabel = PRODUCT_LABELS[order.product]
  const event = createHistoryEvent({
    orderId: order.id,
    type: 'stock_debit',
    stageId: 3,
    stageLabel: getStageTitle(3),
    occurredAt,
    responsible: operatorId,
    message: `Baixa de estoque realizada automaticamente. Produto: ${productLabel}. Quantidade: ${quantity}.`,
    notes: '',
  })

  return touchActivity(
    {
      ...order,
      history: [...order.history, event],
    },
    occurredAt
  )
}

export function getPipelineStages(order: Order): WorkflowStageId[] {
  return getStagesForProduct(order.product)
}

/** Pedidos ativos no Kanban (exclui finalizados, exceto Renovação ativa). */
export function isActiveBoardOrder(order: Order): boolean {
  if (!order.completedAt) return true
  if (
    order.currentStageId === 7 &&
    !order.renovacaoCompletedAt &&
    getStageState(order, 7) === 'active'
  ) {
    return true
  }
  return false
}
