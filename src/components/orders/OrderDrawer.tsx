import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import StageChecklist from '@/components/orders/StageChecklist'
import HistoryTimeline from '@/components/orders/HistoryTimeline'
import StagePipeline from '@/components/orders/StagePipeline'
import { useOrdersStore } from '@/store/ordersStore'
import { useAuthStore } from '@/store/authStore'
import {
  getCanCompleteStage,
  getDueReminders,
  getOrderStatus,
  getStageState,
} from '@/services/workflowService'
import { canUserWorkOnStage } from '@/constants/users'
import { WORKFLOW_STAGES } from '@/constants/workflowStages'
import { PRODUCT_LABELS } from '@/constants/products'
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
  const updateShippingFields = useOrdersStore((s) => s.updateShippingFields)
  const tryCompleteCurrentStage = useOrdersStore(
    (s) => s.tryCompleteCurrentStage
  )

  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!drawerOpen || !order) {
      setNotes('')
      return
    }
    setNotes(order.stages[order.currentStageId]?.observations ?? '')
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
  const isOrderDone =
    Boolean(order?.completedAt) && order?.currentStageId !== 6
  const isExpedicao =
    order?.currentStageId === 2 && stageState === 'active'
  const dueReminders = order ? getDueReminders(order) : []

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
                <Badge variant="neutral">
                  {PRODUCT_LABELS[order.product]}
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

            {dueReminders.length > 0 ? (
              <Card className="border-amber-200 bg-[var(--warning-bg)]">
                <CardContent className="flex gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--warning)]">
                      Tarefa pendente
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--text)]">
                      {dueReminders.map((r) => (
                        <li key={r.id}>{r.label}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : null}

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
                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                    CPF {order.cpf}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  <div className="text-sm text-[var(--text-h)]">{order.email}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {order.phone}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Prontosoft
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium text-[var(--text-h)]">
                    {order.prontosoftOrderNumber?.trim() ? (
                      order.prontosoftOrderNumber
                    ) : (
                      <span className="font-normal text-[var(--text-muted)]">
                        Não informado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Processo atual
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
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-[var(--text-muted)]">
                    Rastreio / Tag
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0.5 text-xs text-[var(--text)]">
                  <div>
                    Rastreio:{' '}
                    <span className="font-mono">
                      {order.trackingCode || '—'}
                    </span>
                  </div>
                  <div>
                    Tag: <span className="font-mono">{order.tags || '—'}</span>
                  </div>
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

            {!isOrderDone || order.currentStageId === 6 ? (
              <>
                {!hasStagePermission ? (
                  <Card className="border-amber-200 bg-[var(--warning-bg)]">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-[var(--warning)]">
                        Sem permissão neste processo
                      </p>
                      <p className="mt-1 text-xs text-[var(--text)]">
                        O processo{' '}
                        {WORKFLOW_STAGES[order.currentStageId].title} não está
                        atribuído ao seu usuário.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                {isExpedicao ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados de expedição</CardTitle>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Estrutura preparada para futura importação de IMEIs via
                        Excel.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-[var(--text-h)]">
                          Código de rastreio
                        </label>
                        <Input
                          className="mt-1.5 font-mono"
                          value={order.trackingCode}
                          disabled={checklistDisabled}
                          placeholder="Ex.: BR123456789ON"
                          onChange={(e) => {
                            const result = updateShippingFields({
                              orderId: order.id,
                              trackingCode: e.target.value,
                            })
                            if (!result.ok && result.error) {
                              toast.error('Ação bloqueada', result.error)
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[var(--text-h)]">
                          IMEIs das Tags/Rastreadores
                        </label>
                        <Textarea
                          className="mt-1.5 font-mono text-xs"
                          value={order.imeis}
                          disabled={checklistDisabled}
                          placeholder="Um IMEI por linha"
                          onChange={(e) => {
                            updateShippingFields({
                              orderId: order.id,
                              imeis: e.target.value,
                            })
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[var(--text-h)]">
                          Tags catalogadas
                        </label>
                        <Input
                          className="mt-1.5 font-mono"
                          value={order.tags}
                          disabled={checklistDisabled}
                          placeholder="Ex.: TAG-1001"
                          onChange={(e) => {
                            updateShippingFields({
                              orderId: order.id,
                              tags: e.target.value,
                            })
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle>Checklist — processo ativo</CardTitle>
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
                    Observações do processo
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
                      placeholder="Registre detalhes deste processo..."
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
                        const finishingPosVenda =
                          order.currentStageId === 5
                        toast.success(
                          finishingPosVenda
                            ? 'Pedido finalizado'
                            : 'Processo concluído',
                          finishingPosVenda
                            ? 'Movido para Pedidos Finalizados.'
                            : 'Próximo processo liberado.'
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
                    Concluir processo
                  </Button>
                  {!canComplete ? (
                    <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                      {!hasStagePermission
                        ? 'Você não tem permissão para concluir este processo.'
                        : order.currentStageId === 2 &&
                            !order.trackingCode.trim()
                          ? 'Informe o código de rastreio para concluir.'
                          : 'Marque todos os itens obrigatórios para concluir.'}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <Card className="border-[var(--accent-border)] bg-[var(--accent-bg)]">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-[var(--accent)]">
                    Pedido finalizado
                  </p>
                  <p className="mt-1 text-xs text-[var(--text)]">
                    O pós-venda foi concluído. Este pedido está em Pedidos
                    Finalizados.
                    {order.stages[6]?.scheduledFor &&
                    !order.renovacaoCompletedAt
                      ? ' A Renovação permanece agendada.'
                      : ''}
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
