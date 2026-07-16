import type { ChecklistItem, WorkflowStageId } from '@/types/workflow'

export const WORKFLOW_STAGE_ORDER: WorkflowStageId[] = [1, 2, 3, 4, 5, 6, 7, 8]

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
    title: 'Recebimento',
    description: 'Confirmar chegada e registrar o início do processo.',
    checklistTemplate: [
      { id: 'arrived', label: 'Confirmar chegada do pedido', required: true },
      { id: 'info', label: 'Conferir informações', required: true },
      { id: 'wa', label: 'Enviar mensagem WhatsApp (simulação)', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  2: {
    id: 2,
    title: 'Checklist',
    description: 'Verificação obrigatória antes do processamento.',
    checklistTemplate: [
      { id: 'items', label: 'Conferir itens e quantidades', required: true },
      { id: 'docs', label: 'Verificar documentos e observações', required: true },
      { id: 'quality', label: 'Confirmar qualidade visual', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  3: {
    id: 3,
    title: 'Processamento',
    description: 'Preparar internamente o pedido para conferência.',
    checklistTemplate: [
      { id: 'prep', label: 'Preparar pedido para conferência', required: true },
      { id: 'plan', label: 'Validar plano de execução', required: true },
      { id: 'notes', label: 'Registrar observações da etapa', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  4: {
    id: 4,
    title: 'Conferência',
    description: 'Checagem final antes de separar e expedir.',
    checklistTemplate: [
      { id: 'verify', label: 'Conferir conformidade geral', required: true },
      { id: 'risk', label: 'Validar divergências (se houver)', required: true },
      { id: 'ready', label: 'Confirmar prontidão para separação', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  5: {
    id: 5,
    title: 'Separação',
    description: 'Organizar e separar itens para expedição.',
    checklistTemplate: [
      { id: 'pick', label: 'Separar itens do pedido', required: true },
      { id: 'pack', label: 'Embalar corretamente', required: true },
      { id: 'label', label: 'Etiquetar e conferir volumes', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  6: {
    id: 6,
    title: 'Expedição',
    description: 'Roteamento para envio e registros finais.',
    checklistTemplate: [
      { id: 'ship', label: 'Preparar envio', required: true },
      { id: 'route', label: 'Confirmar rota/transportadora', required: true },
      { id: 'handoff', label: 'Confirmar entrega para expedição', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  7: {
    id: 7,
    title: 'Finalização',
    description: 'Fechamento operacional antes do status final.',
    checklistTemplate: [
      { id: 'close', label: 'Realizar fechamento operacional', required: true },
      { id: 'check2', label: 'Confirmar última conferência', required: true },
      { id: 'review', label: 'Revisar dados finais do pedido', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
  8: {
    id: 8,
    title: 'Concluído',
    description: 'Pedido finalizado e pronto para histórico/relatórios.',
    checklistTemplate: [
      { id: 'done', label: 'Confirmar conclusão do pedido', required: true },
      { id: 'archive', label: 'Arquivar registros da operação', required: true },
      { id: 'finalize', label: 'Finalizar checklist', required: true },
    ],
  },
}

export const getStageTitle = (stageId: WorkflowStageId) => WORKFLOW_STAGES[stageId].title
