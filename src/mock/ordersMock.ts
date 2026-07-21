import { OPERADOR_FICTICIO } from '@/constants/users'
import { getStagesForProduct, WORKFLOW_STAGES } from '@/constants/workflowStages'
import { createOrder } from '@/services/orderService'
import type {
  ChecklistItem,
  Order,
  OrderHistoryEvent,
  ProductType,
  WorkflowStageId,
} from '@/types/workflow'

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function setChecklistForStage(
  order: Order,
  stageId: WorkflowStageId,
  opts: { checked: boolean; partial?: string[] }
) {
  const stage = order.stages[stageId]
  if (!stage) return
  const partialSet = new Set(opts.partial ?? [])

  const nextChecklist: ChecklistItem[] = stage.checklist.map((it) => {
    const shouldCheck =
      opts.partial != null ? partialSet.has(it.id) : opts.checked
    return { ...it, checked: shouldCheck }
  })

  order.stages[stageId]!.checklist = nextChecklist
}

function buildRichHistory(order: Order) {
  const history: OrderHistoryEvent[] = []
  const op = OPERADOR_FICTICIO
  const stageIds = getStagesForProduct(order.product)

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

  for (const stageId of stageIds) {
    const stage = order.stages[stageId]
    if (!stage) continue
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

      if (stageId < 5) {
        const nextId = (stageId + 1) as WorkflowStageId
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
  startedAt?: string
  finishedAt?: string
  partial?: string[]
  observations?: string
  scheduledFor?: string
}

export function seedMockOrders() {
  const op = OPERADOR_FICTICIO

  const base: Array<{
    number: string
    client: string
    cpf: string
    email: string
    phone: string
    product: ProductType
    observations: string
    prontosoftOrderNumber?: string
    trackingCode?: string
    imeis?: string
    tags?: string
    createdAt: string
    currentStageId: WorkflowStageId
    completedAt?: string
    stages: Partial<Record<WorkflowStageId, StageSeed>>
    reminders?: Order['reminders']
  }> = [
    {
      number: 'PED-0001',
      client: 'Mariana Souza',
      cpf: '123.456.789-00',
      email: 'mariana.souza@email.com',
      phone: '(11) 98888-1001',
      product: 'mini_rastreador',
      observations: 'Cliente pediu prioridade se possível',
      prontosoftOrderNumber: 'PS-2026-00001',
      createdAt: isoDaysAgo(0.1),
      currentStageId: 1,
      stages: {
        1: { startedAt: isoHoursAgo(2.2), partial: ['criar'] },
      },
    },
    {
      number: 'PED-0002',
      client: 'Carlos Lima',
      cpf: '987.654.321-00',
      email: 'carlos.lima@email.com',
      phone: '(21) 97777-2002',
      product: 'lv12_4g',
      observations: 'Sem observações adicionais',
      prontosoftOrderNumber: 'PS-2026-00002',
      createdAt: isoDaysAgo(0.2),
      currentStageId: 2,
      stages: {
        1: {
          startedAt: isoHoursAgo(6),
          finishedAt: isoHoursAgo(4),
          observations: 'Cadastro conferido na Prontosoft',
        },
        2: { startedAt: isoHoursAgo(3.5), partial: ['imprimir', 'imeis'] },
      },
    },
    {
      number: 'PED-0003',
      client: 'Ana Beatriz',
      cpf: '111.222.333-44',
      email: 'ana.beatriz@email.com',
      phone: '(31) 96666-3003',
      product: 'mini_rastreador',
      observations: 'Conferir IMEIs com atenção',
      prontosoftOrderNumber: 'PS-2026-00003',
      trackingCode: 'BR123456789ON',
      imeis: '356938035643809',
      tags: 'TAG-1001',
      createdAt: isoDaysAgo(0.6),
      currentStageId: 3,
      stages: {
        1: { startedAt: isoHoursAgo(10), finishedAt: isoHoursAgo(8) },
        2: { startedAt: isoHoursAgo(8), finishedAt: isoHoursAgo(6) },
        3: { startedAt: isoHoursAgo(5), partial: ['ontime', 'informar'] },
      },
    },
    {
      number: 'PED-0004',
      client: 'Bruno Rocha',
      cpf: '555.666.777-88',
      email: 'bruno.rocha@email.com',
      phone: '(41) 95555-4004',
      product: 'lv12_4g',
      observations: 'Aguardando confirmação de recebimento',
      trackingCode: 'BR987654321ON',
      imeis: '490154203237518',
      tags: 'TAG-2044',
      createdAt: isoDaysAgo(1.2),
      currentStageId: 4,
      stages: {
        1: { startedAt: isoHoursAgo(30), finishedAt: isoHoursAgo(26) },
        2: { startedAt: isoHoursAgo(26), finishedAt: isoHoursAgo(22) },
        3: { startedAt: isoHoursAgo(22), finishedAt: isoHoursAgo(12) },
        4: { startedAt: isoHoursAgo(10), partial: ['recebimento'] },
      },
    },
    {
      number: 'PED-0005',
      client: 'Fernanda Alves',
      cpf: '222.333.444-55',
      email: 'fernanda.alves@email.com',
      phone: '(51) 94444-5005',
      product: 'mini_rastreador',
      observations: 'Follow-up pós-venda vencido — contato pendente',
      trackingCode: 'BR555666777ON',
      imeis: '359051095001234',
      tags: 'TAG-3301',
      createdAt: isoDaysAgo(10),
      currentStageId: 5,
      stages: {
        1: { startedAt: isoDaysAgo(10), finishedAt: isoDaysAgo(9.8) },
        2: { startedAt: isoDaysAgo(9.8), finishedAt: isoDaysAgo(9.5) },
        3: { startedAt: isoDaysAgo(9.5), finishedAt: isoDaysAgo(8) },
        4: { startedAt: isoDaysAgo(8), finishedAt: isoDaysAgo(7.5) },
        5: { startedAt: isoDaysAgo(7.2), partial: ['contato'] },
        6: { scheduledFor: isoDaysFromNow(120) },
      },
      reminders: [
        {
          id: crypto.randomUUID(),
          type: 'pos_venda_7d',
          stageId: 5,
          dueAt: isoDaysAgo(0.2),
          status: 'due',
          label: 'Follow-up pós-venda (7 dias)',
        },
        {
          id: crypto.randomUUID(),
          type: 'renovacao_5m',
          stageId: 6,
          dueAt: isoDaysFromNow(120),
          status: 'pending',
          label: 'Renovação Mini Rastreador (5 meses)',
        },
      ],
    },
    {
      number: 'PED-0006',
      client: 'Diego Martins',
      cpf: '333.444.555-66',
      email: 'diego.martins@email.com',
      phone: '(61) 93333-6006',
      product: 'lv12_4g',
      observations: 'Fluxo concluído com sucesso',
      trackingCode: 'BR111222333ON',
      imeis: '352094089012345',
      tags: 'TAG-4410',
      createdAt: isoDaysAgo(14),
      currentStageId: 5,
      completedAt: isoDaysAgo(2),
      stages: {
        1: { startedAt: isoDaysAgo(14), finishedAt: isoDaysAgo(13.5) },
        2: { startedAt: isoDaysAgo(13.5), finishedAt: isoDaysAgo(13) },
        3: { startedAt: isoDaysAgo(13), finishedAt: isoDaysAgo(10) },
        4: { startedAt: isoDaysAgo(10), finishedAt: isoDaysAgo(8) },
        5: { startedAt: isoDaysAgo(8), finishedAt: isoHoursAgo(2) },
      },
    },
    {
      number: 'PED-0007',
      client: 'Patrícia Mendes',
      cpf: '444.555.666-77',
      email: 'patricia.mendes@email.com',
      phone: '(71) 92222-7007',
      product: 'mini_rastreador',
      observations: 'Pedido finalizado — renovação agendada',
      trackingCode: 'BR444555666ON',
      imeis: '358240051111222',
      tags: 'TAG-5520',
      createdAt: isoDaysAgo(20),
      currentStageId: 5,
      completedAt: isoDaysAgo(3),
      stages: {
        1: { startedAt: isoDaysAgo(20), finishedAt: isoDaysAgo(19.5) },
        2: { startedAt: isoDaysAgo(19.5), finishedAt: isoDaysAgo(19) },
        3: { startedAt: isoDaysAgo(19), finishedAt: isoDaysAgo(16) },
        4: { startedAt: isoDaysAgo(16), finishedAt: isoDaysAgo(14) },
        5: { startedAt: isoDaysAgo(14), finishedAt: isoDaysAgo(3) },
        6: { scheduledFor: isoDaysFromNow(90) },
      },
      reminders: [
        {
          id: crypto.randomUUID(),
          type: 'renovacao_5m',
          stageId: 6,
          dueAt: isoDaysFromNow(90),
          status: 'pending',
          label: 'Renovação Mini Rastreador (5 meses)',
        },
      ],
    },
  ]

  return base.map((b) => {
    const order = createOrder({
      number: b.number,
      client: b.client,
      cpf: b.cpf,
      email: b.email,
      phone: b.phone,
      product: b.product,
      observations: b.observations,
      prontosoftOrderNumber: b.prontosoftOrderNumber ?? '',
      operatorId: op,
    })

    order.createdAt = b.createdAt
    order.currentStageId = b.currentStageId
    order.currentResponsible = op
    order.trackingCode = b.trackingCode ?? ''
    order.imeis = b.imeis ?? ''
    order.tags = b.tags ?? ''
    if (b.reminders) order.reminders = b.reminders

    for (const stageId of getStagesForProduct(b.product)) {
      const seed = b.stages[stageId]
      if (!seed) continue

      const stage = order.stages[stageId]!
      if (seed.startedAt) {
        stage.startedAt = seed.startedAt
        stage.responsible = op
      }
      if (seed.scheduledFor) {
        stage.scheduledFor = seed.scheduledFor
      }
      if (seed.observations) {
        stage.observations = seed.observations
      }

      if (seed.finishedAt) {
        stage.finishedAt = seed.finishedAt
        stage.startedAt = stage.startedAt ?? seed.startedAt ?? seed.finishedAt
        stage.responsible = op
        setChecklistForStage(order, stageId, { checked: true })
      } else if (seed.partial) {
        if (seed.startedAt) stage.startedAt = seed.startedAt
        stage.responsible = op
        setChecklistForStage(order, stageId, {
          checked: false,
          partial: seed.partial,
        })
      }
    }

    if (b.completedAt) {
      order.completedAt = b.completedAt
      order.status = 'Concluídos'
    } else {
      order.status = b.currentStageId === 1 ? 'Pendentes' : 'Em Andamento'
    }

    buildRichHistory(order)
    return order
  })
}
