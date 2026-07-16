import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import StageChecklist from '@/components/orders/StageChecklist'
import HistoryTimeline from '@/components/orders/HistoryTimeline'
import StagePipeline from '@/components/orders/StagePipeline'
import { useOrdersStore } from '@/store/ordersStore'
import { useAuthStore } from '@/store/authStore'
import {
  getCanCompleteStage,
  getOrderStatus,
  getStageState,
} from '@/services/workflowService'
import { canUserWorkOnStage } from '@/constants/users'
import { WORKFLOW_STAGES } from '@/constants/workflowStages'
import { formatDate, formatTime } from '@/utils/date'
import { toast } from '@/components/ui/toast'

export default function OrderDrawer() {
  const drawerOpen = useOrdersStore((s) => s.drawerOpen)
  const selectedOrderId = useOrdersStore((s) => s.selectedOrderId)
  const order = useOrdersStore((s) =>
    selectedOrderId ? s.orders.find((o) => o.id === selectedOrderId) : undefined
  )
  const currentUser = useAuthStore((s) => s.currentUser)

  const closeDrawer = useOrdersStore((s) => s.closeDrawer)
  const toggleChecklistItem = useOrdersStore((s) => s.toggleChecklistItem)
  const updateStageObservations = useOrdersStore(
    (s) => s.updateStageObservations
  )
  const tryCompleteCurrentStage = useOrdersStore(
    (s) => s.tryCompleteCurrentStage
  )

  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!drawerOpen || !order) {
      setNotes('')
      return
    }
    setNotes(order.stages[order.currentStageId].observations ?? '')
  }, [drawerOpen, order?.id, order?.currentStageId])

  const stageProgress = order
    ? order.stages[order.currentStageId]
    : undefined
  const stageState = order
    ? getStageState(order, order.currentStageId)
    : 'locked'
  const hasStagePermission = order
    ? canUserWorkOnStage(currentUser, order.currentStageId)
    : false
  const checklistOk =
    order && stageProgress
      ? getCanCompleteStage(order, order.currentStageId)
      : false
  const canComplete = checklistOk && hasStagePermission
  const checklistDisabled = stageState !== 'active' || !hasStagePermission
  const isOrderDone = Boolean(order?.completedAt)

  return (
    <Sheet
      open={drawerOpen}
      onOpenChange={(v) => {
        if (!v) closeDrawer()
      }}
    >
      <SheetContent side="right" className="overflow-y-auto">
        {!order ? (
          <div className="p-6">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando pedido...
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5 pt-4">
            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium text-[var(--text-muted)]">
                  {order.number}
                </span>
                <Badge
                  variant={
                    getOrderStatus(order) === 'Concluídos'
                      ? 'success'
                      : getOrderStatus(order) === 'Em Andamento'
                        ? 'accent'
                        : 'neutral'
                  }
                >
                  {order.status}
                </Badge>
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--text-h)]">
                {WORKFLOW_STAGES[order.currentStageId].title}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Responsável: {order.currentResponsible} · Criado em{' '}
                {formatDate(order.createdAt)}
              </p>
            </div>

            <StagePipeline order={order} />

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium text-[var(--text-h)]">
                    {order.client}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Etapa atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-sm font-medium text-[var(--text-h)]">
                    {WORKFLOW_STAGES[order.currentStageId].title}
                  </div>
                  {stageProgress?.startedAt ? (
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Início: {formatDate(stageProgress.startedAt)}{' '}
                      {formatTime(stageProgress.startedAt)}
                    </div>
                  ) : null}
                  {stageProgress?.finishedAt ? (
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Conclusão: {formatDate(stageProgress.finishedAt)}{' '}
                      {formatTime(stageProgress.finishedAt)}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Descrição
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-[var(--text)]">
                    {order.description}
                  </p>
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Observações gerais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-[var(--text)]">
                    {order.observations?.trim() || '—'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {!isOrderDone ? (
              <>
                {!hasStagePermission ? (
                  <Card className="border-amber-200 bg-[var(--warning-bg)]">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-[var(--warning)]">
                        Sem permissão nesta etapa
                      </p>
                      <p className="mt-1 text-xs text-[var(--text)]">
                        A etapa {WORKFLOW_STAGES[order.currentStageId].title} não
                        está atribuída ao seu usuário. Solicite liberação ao
                        Admin Master.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle>Checklist — etapa ativa</CardTitle>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Conclua todos os itens obrigatórios para avançar.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {stageProgress ? (
                      <StageChecklist
                        items={stageProgress.checklist}
                        disabled={checklistDisabled}
                        onToggle={(itemId, checked) => {
                          const result = toggleChecklistItem({
                            orderId: order.id,
                            stageId: order.currentStageId,
                            itemId,
                            checked,
                          })
                          if (!result.ok && result.error) {
                            toast.error('Ação bloqueada', result.error)
                          }
                        }}
                      />
                    ) : null}
                  </CardContent>
                </Card>

                <div>
                  <label className="text-xs font-medium text-[var(--text-h)]">
                    Observações da etapa
                  </label>
                  <div className="mt-1.5">
                    <Textarea
                      value={notes}
                      disabled={checklistDisabled}
                      onChange={(e) => {
                        setNotes(e.target.value)
                        updateStageObservations({
                          orderId: order.id,
                          stageId: order.currentStageId,
                          observations: e.target.value,
                        })
                      }}
                      placeholder="Registre detalhes desta etapa..."
                    />
                  </div>
                </div>

                <div>
                  <Button
                    className="w-full"
                    disabled={!canComplete}
                    onClick={() => {
                      const result = tryCompleteCurrentStage({
                        orderId: order.id,
                        notes,
                      })
                      if (result.ok) {
                        setNotes('')
                        toast.success(
                          'Etapa concluída',
                          'Próxima etapa liberada.'
                        )
                      } else {
                        toast.error(
                          'Não foi possível concluir',
                          result.error ??
                            'Verifique o checklist e suas permissões.'
                        )
                      }
                    }}
                  >
                    Concluir Etapa
                  </Button>
                  {!canComplete ? (
                    <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                      {!hasStagePermission
                        ? 'Você não tem permissão para concluir esta etapa.'
                        : 'Marque todos os itens obrigatórios para concluir.'}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <Card className="border-[var(--accent-border)] bg-[var(--accent-bg)]">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-[var(--accent)]">
                    Pedido concluído
                  </p>
                  <p className="mt-1 text-xs text-[var(--text)]">
                    Todas as 8 etapas foram finalizadas.
                  </p>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="mb-3 text-sm font-medium text-[var(--text-h)]">
                Histórico
              </h3>
              <HistoryTimeline events={order.history} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
