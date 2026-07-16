import { OPERADOR_FICTICIO } from '@/constants/users'
import { WORKFLOW_STAGE_ORDER, WORKFLOW_STAGES } from '@/constants/workflowStages'
import { createOrder } from '@/services/orderService'
import type {
  ChecklistItem,
  Order,
  OrderHistoryEvent,
  WorkflowStageId,
} from '@/types/workflow'

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function setChecklistForStage(
  order: Order,
  stageId: WorkflowStageId,
  opts: { checked: boolean; partial?: string[] }
) {
  const stage = order.stages[stageId]
  const partialSet = new Set(opts.partial ?? [])

  const nextChecklist: ChecklistItem[] = stage.checklist.map((it) => {
    const shouldCheck =
      opts.partial != null ? partialSet.has(it.id) : opts.checked
    return { ...it, checked: shouldCheck }
  })

  order.stages[stageId].checklist = nextChecklist
}

function buildRichHistory(order: Order) {
  const history: OrderHistoryEvent[] = []
  const op = OPERADOR_FICTICIO

  history.push({
    id: crypto.randomUUID(),
    orderId: order.id,
    type: 'created',
    stageId: 1,
    stageLabel: WORKFLOW_STAGES[1].title,
    occurredAt: order.createdAt,
    responsible: op,
    message: `Pedido ${order.number} criado.`,
    notes: '',
  })

  for (const stageId of WORKFLOW_STAGE_ORDER) {
    const stage = order.stages[stageId]
    const title = WORKFLOW_STAGES[stageId].title

    if (stage.startedAt) {
      history.push({
        id: crypto.randomUUID(),
        orderId: order.id,
        type: 'started',
        stageId,
        stageLabel: title,
        occurredAt: stage.startedAt,
        responsible: stage.responsible ?? op,
        message: `${stage.responsible ?? op} iniciou ${title}.`,
        notes: '',
      })
    }

    if (stage.finishedAt) {
      history.push({
        id: crypto.randomUUID(),
        orderId: order.id,
        type: 'completed',
        stageId,
        stageLabel: title,
        occurredAt: stage.finishedAt,
        responsible: stage.responsible ?? op,
        message: `${stage.responsible ?? op} concluiu ${title}.`,
        notes: stage.observations || '',
      })

      const nextId = (stageId + 1) as WorkflowStageId
      if (stageId < 8 && WORKFLOW_STAGES[nextId]) {
        history.push({
          id: crypto.randomUUID(),
          orderId: order.id,
          type: 'released',
          stageId: nextId,
          stageLabel: WORKFLOW_STAGES[nextId].title,
          occurredAt: stage.finishedAt,
          responsible: stage.responsible ?? op,
          message: `Pedido liberado para ${WORKFLOW_STAGES[nextId].title}.`,
          notes: '',
        })
      }
    }
  }

  history.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  )
  order.history = history
}

type StageSeed = {
  startedAt: string
  finishedAt?: string
  partial?: string[]
  observations?: string
}

export function seedMockOrders() {
  const op = OPERADOR_FICTICIO

  const base: Array<{
    number: string
    client: string
    description: string
    observations: string
    createdAt: string
    currentStageId: WorkflowStageId
    stages: Partial<Record<WorkflowStageId, StageSeed>>
  }> = [
    {
      number: 'PED-0001',
      client: 'Mariana Souza',
      description: 'Compra de acessórios',
      observations: 'Cliente pediu prioridade se possível',
      createdAt: isoDaysAgo(0.1),
      currentStageId: 1,
      stages: {
        1: { startedAt: isoHoursAgo(2.2), partial: ['arrived'] },
      },
    },
    {
      number: 'PED-0002',
      client: 'Carlos Lima',
      description: 'Pedido de peças',
      observations: 'Sem observações adicionais',
      createdAt: isoDaysAgo(0.2),
      currentStageId: 2,
      stages: {
        1: {
          startedAt: isoHoursAgo(6),
          finishedAt: isoHoursAgo(4),
          observations: 'Recebido sem divergências',
        },
        2: { startedAt: isoHoursAgo(3.5), partial: ['items', 'docs'] },
      },
    },
    {
      number: 'PED-0003',
      client: 'Ana Beatriz',
      description: 'Serviço + montagem',
      observations: 'Conferir marcas',
      createdAt: isoDaysAgo(0.6),
      currentStageId: 4,
      stages: {
        1: { startedAt: isoHoursAgo(10), finishedAt: isoHoursAgo(8) },
        2: { startedAt: isoHoursAgo(8), finishedAt: isoHoursAgo(7) },
        3: { startedAt: isoHoursAgo(7), finishedAt: isoHoursAgo(5) },
        4: { startedAt: isoHoursAgo(4.2), partial: ['verify', 'risk'] },
      },
    },
    {
      number: 'PED-0004',
      client: 'Bruno Rocha',
      description: 'Orçamento aprovado',
      observations: 'Sem alterações',
      createdAt: isoDaysAgo(1.2),
      currentStageId: 6,
      stages: {
        1: { startedAt: isoHoursAgo(30), finishedAt: isoHoursAgo(26) },
        2: { startedAt: isoHoursAgo(26), finishedAt: isoHoursAgo(22) },
        3: { startedAt: isoHoursAgo(22), finishedAt: isoHoursAgo(18) },
        4: { startedAt: isoHoursAgo(18), finishedAt: isoHoursAgo(15) },
        5: { startedAt: isoHoursAgo(15), finishedAt: isoHoursAgo(10) },
        6: { startedAt: isoHoursAgo(9), partial: ['ship', 'route'] },
      },
    },
    {
      number: 'PED-0005',
      client: 'Fernanda Alves',
      description: 'Pedido final',
      observations: 'Atualizar cliente após expedição',
      createdAt: isoDaysAgo(0.3),
      currentStageId: 7,
      stages: {
        1: { startedAt: isoHoursAgo(14), finishedAt: isoHoursAgo(12) },
        2: { startedAt: isoHoursAgo(12), finishedAt: isoHoursAgo(10) },
        3: { startedAt: isoHoursAgo(10), finishedAt: isoHoursAgo(8.5) },
        4: { startedAt: isoHoursAgo(8.5), finishedAt: isoHoursAgo(7.2) },
        5: { startedAt: isoHoursAgo(7.2), finishedAt: isoHoursAgo(6) },
        6: { startedAt: isoHoursAgo(6), finishedAt: isoHoursAgo(4.6) },
        7: { startedAt: isoHoursAgo(3.2), partial: ['close', 'check2'] },
      },
    },
    {
      number: 'PED-0006',
      client: 'Diego Martins',
      description: 'Encerrado com sucesso',
      observations: 'Concluído dentro do SLA',
      createdAt: isoDaysAgo(0.9),
      currentStageId: 8,
      stages: {
        1: { startedAt: isoHoursAgo(20), finishedAt: isoHoursAgo(17) },
        2: { startedAt: isoHoursAgo(17), finishedAt: isoHoursAgo(15) },
        3: { startedAt: isoHoursAgo(15), finishedAt: isoHoursAgo(13) },
        4: { startedAt: isoHoursAgo(13), finishedAt: isoHoursAgo(11) },
        5: { startedAt: isoHoursAgo(11), finishedAt: isoHoursAgo(9.8) },
        6: { startedAt: isoHoursAgo(9.8), finishedAt: isoHoursAgo(7.4) },
        7: { startedAt: isoHoursAgo(7.4), finishedAt: isoHoursAgo(5) },
        8: { startedAt: isoHoursAgo(4.2), finishedAt: isoHoursAgo(3.2) },
      },
    },
  ]

  return base.map((b) => {
    const order = createOrder({
      number: b.number,
      client: b.client,
      description: b.description,
      observations: b.observations,
      operatorId: op,
    })

    order.createdAt = b.createdAt
    order.currentStageId = b.currentStageId
    order.currentResponsible = op

    for (const stageId of WORKFLOW_STAGE_ORDER) {
      const seed = b.stages[stageId]
      if (!seed) continue

      order.stages[stageId].startedAt = seed.startedAt
      order.stages[stageId].responsible = op
      if (seed.observations) {
        order.stages[stageId].observations = seed.observations
      }

      if (seed.finishedAt) {
        order.stages[stageId].finishedAt = seed.finishedAt
        setChecklistForStage(order, stageId, { checked: true })
      } else if (seed.partial) {
        setChecklistForStage(order, stageId, {
          checked: false,
          partial: seed.partial,
        })
      }
    }

    if (b.currentStageId === 8 && b.stages[8]?.finishedAt) {
      order.completedAt = b.stages[8].finishedAt
      order.status = 'Concluídos'
    } else {
      order.status =
        b.currentStageId === 1 ? 'Pendentes' : 'Em Andamento'
    }

    buildRichHistory(order)
    return order
  })
}
