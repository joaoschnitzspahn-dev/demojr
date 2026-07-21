import type { ChecklistItem, ProductType, WorkflowStageId } from '@/types/workflow'
import { requiresRenovacao } from '@/constants/products'

export const BASE_WORKFLOW_STAGES: WorkflowStageId[] = [1, 2, 3, 4, 5]
export const RENOVACAO_STAGE_ID: WorkflowStageId = 6
export const ALL_WORKFLOW_STAGES: WorkflowStageId[] = [1, 2, 3, 4, 5, 6]

/** Alias — inclui Renovação para atribuição de usuários e Kanban. */
export const WORKFLOW_STAGE_ORDER = ALL_WORKFLOW_STAGES

export const WORKFLOW_STAGES: Record<
  WorkflowStageId,
  {
    id: WorkflowStageId
    title: string
    description?: string
    checklistTemplate: Omit<ChecklistItem, 'checked'>[]
  }
> = {
  1: {
    id: 1,
    title: 'Cadastro do Pedido',
    description: 'Registrar e iniciar oficialmente o pedido.',
    checklistTemplate: [
      { id: 'criar', label: 'Criar o pedido', required: true },
      {
        id: 'ligar_cliente',
        label:
          'Ligar para o cliente informando: pedido recebido, prazo de até 48h úteis para envio e que o código de rastreio será enviado após a postagem',
        required: true,
      },
      {
        id: 'prontosoft',
        label: 'Cadastrar o pedido na Prontosoft',
        required: true,
      },
      { id: 'conferir', label: 'Conferir informações', required: true },
    ],
  },
  2: {
    id: 2,
    title: 'Expedição',
    description: 'Preparar e enviar o equipamento.',
    checklistTemplate: [
      { id: 'imprimir', label: 'Imprimir pedido', required: true },
      { id: 'lacres', label: 'Retirar lacres', required: true },
      { id: 'embalar', label: 'Embalar para envio', required: true },
      {
        id: 'rastreio',
        label: 'Informar código de rastreio',
        required: true,
      },
    ],
  },
  3: {
    id: 3,
    title: 'Acompanhamento da Entrega',
    description: 'Monitorar o envio até o cliente.',
    checklistTemplate: [
      {
        id: 'ontime',
        label: 'Confirmar que o equipamento subiu na Ontime',
        required: true,
      },
      { id: 'informar', label: 'Informar o cliente', required: true },
      {
        id: 'confirmar_rastreio',
        label: 'Confirmar envio do código de rastreio',
        required: true,
      },
      {
        id: 'cidade_cliente',
        label:
          'Quando a encomenda chegar na cidade do cliente: informar o cliente e solicitar contato ao receber o equipamento para desbloqueio',
        required: true,
      },
    ],
  },
  4: {
    id: 4,
    title: 'Confirmação de Recebimento',
    description: 'Finalizar a entrega e preparar a utilização do equipamento.',
    checklistTemplate: [
      {
        id: 'recebimento',
        label: 'Confirmar recebimento pelo cliente',
        required: true,
      },
      {
        id: 'desvincular',
        label: 'Desvincular Tag da conta Ontime',
        required: true,
      },
      {
        id: 'liberar_tag',
        label: 'Liberar a Tag para reutilização',
        required: true,
      },
      {
        id: 'apps',
        label: 'Enviar links dos aplicativos',
        required: true,
      },
      { id: 'tutoriais', label: 'Enviar tutoriais', required: true },
    ],
  },
  5: {
    id: 5,
    title: 'Pós-venda',
    description: 'Garantir que o cliente esteja utilizando corretamente o produto.',
    checklistTemplate: [
      {
        id: 'contato',
        label: 'Entrar em contato com o cliente',
        required: true,
      },
      {
        id: 'funcionando',
        label: 'Perguntar se o equipamento está funcionando corretamente',
        required: true,
      },
      {
        id: 'boas_vindas',
        label: 'Enviar mensagem de boas-vindas',
        required: true,
      },
      {
        id: 'video',
        label: 'Enviar vídeo de apresentação',
        required: true,
      },
    ],
  },
  6: {
    id: 6,
    title: 'Renovação',
    description: 'Renovação do Mini Rastreador (agendada para 5 meses).',
    checklistTemplate: [
      {
        id: 'contato_renovacao',
        label: 'Entrar em contato com o cliente',
        required: true,
      },
      {
        id: 'boleto',
        label: 'Enviar boleto de renovação',
        required: true,
      },
      {
        id: 'resposta',
        label: 'Registrar resposta do cliente',
        required: true,
      },
    ],
  },
}

export const getStageTitle = (stageId: WorkflowStageId) =>
  WORKFLOW_STAGES[stageId].title

export function getStagesForProduct(product: ProductType): WorkflowStageId[] {
  if (requiresRenovacao(product)) return [...ALL_WORKFLOW_STAGES]
  return [...BASE_WORKFLOW_STAGES]
}

export function getNextStageId(
  current: WorkflowStageId,
  product: ProductType
): WorkflowStageId | null {
  const stages = getStagesForProduct(product)
  const idx = stages.indexOf(current)
  if (idx === -1 || idx >= stages.length - 1) return null
  return stages[idx + 1]
}

export function isFinalOperationalStage(
  stageId: WorkflowStageId,
  product: ProductType
): boolean {
  // Pós-venda finaliza o pedido operacional; Renovação é processo agendado à parte.
  if (stageId === 5) return true
  if (stageId === 6 && requiresRenovacao(product)) return false
  return getNextStageId(stageId, product) === null
}
