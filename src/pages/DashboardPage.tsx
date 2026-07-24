import * as React from 'react'
import { Bell, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import KanbanBoard from '@/components/orders/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersStore } from '@/store/ordersStore'
import { useInitializeOrders } from '@/hooks/useInitializeOrders'
import { isToday } from '@/utils/date'
import {
  getDueReminders,
  getOrderStatus,
  getStalledOrderAlerts,
  isActiveBoardOrder,
} from '@/services/workflowService'
import { STALLED_ORDER_MINUTES } from '@/constants/alerts'
import { useStalledOrderNotifications } from '@/hooks/useStalledOrderNotifications'

function StatCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string
  value: number
  subtitle?: string
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium text-[var(--text-muted)]">
          {title}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-12" />
        ) : (
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            {value}
          </div>
        )}
        {subtitle ? (
          <div className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  useInitializeOrders()

  const orders = useOrdersStore((s) => s.orders)
  const loading = useOrdersStore((s) => s.loading)
  const selectOrder = useOrdersStore((s) => s.selectOrder)
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  const activeOrders = React.useMemo(
    () => orders.filter(isActiveBoardOrder),
    [orders]
  )

  const todayCount = React.useMemo(
    () => orders.filter((o) => isToday(o.createdAt)).length,
    [orders]
  )
  const completedCount = React.useMemo(
    () => orders.filter((o) => getOrderStatus(o) === 'Concluídos').length,
    [orders]
  )
  const pendingCount = React.useMemo(
    () =>
      activeOrders.filter(
        (o) => o.currentStageId === 1 && getOrderStatus(o) !== 'Concluídos'
      ).length,
    [activeOrders]
  )
  const inProgressCount = React.useMemo(
    () => activeOrders.filter((o) => getOrderStatus(o) === 'Em Andamento').length,
    [activeOrders]
  )
  const dueAlerts = React.useMemo(
    () => orders.reduce((acc, o) => acc + getDueReminders(o).length, 0),
    [orders]
  )
  const stalledAlerts = React.useMemo(
    () => getStalledOrderAlerts(activeOrders, now),
    [activeOrders, now]
  )
  useStalledOrderNotifications(stalledAlerts)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Pedidos ativos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Cadastro → Nota Fiscal e Etiqueta → Expedição → Entrega →
            Recebimento → Pós-venda.
          </p>
        </div>

        <Link to="/cadastro">
          <Button>
            <Plus className="h-3.5 w-3.5" />
            Cadastrar pedido
          </Button>
        </Link>
      </div>

      {stalledAlerts.length > 0 ? (
        <Card className="mt-6 border-amber-200 bg-[var(--warning-bg)]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
              <div>
                <p className="text-sm font-medium text-[var(--warning)]">
                  {stalledAlerts.length} pedido
                  {stalledAlerts.length > 1 ? 's' : ''} parado
                  {stalledAlerts.length > 1 ? 's' : ''} (+
                  {STALLED_ORDER_MINUTES} min)
                </p>
                <p className="mt-0.5 text-xs text-[var(--text)]">
                  {stalledAlerts
                    .slice(0, 3)
                    .map((a) => `${a.orderNumber} (${a.minutesIdle} min)`)
                    .join(' · ')}
                  {stalledAlerts.length > 3
                    ? ` · +${stalledAlerts.length - 3}`
                    : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectOrder(stalledAlerts[0]!.orderId)}
              >
                Abrir primeiro
              </Button>
              <Link to="/alertas">
                <Button size="sm">Central de Alertas</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Pedidos hoje"
          value={todayCount}
          loading={loading}
          subtitle="Criados hoje"
        />
        <StatCard
          title="Cadastro"
          value={pendingCount}
          loading={loading}
          subtitle="Processo 1"
        />
        <StatCard
          title="Em andamento"
          value={inProgressCount}
          loading={loading}
          subtitle="Processos 2–6"
        />
        <StatCard
          title="Alertas"
          value={dueAlerts + stalledAlerts.length}
          loading={loading}
          subtitle="Tarefas + parados"
        />
        <StatCard
          title="Finalizados"
          value={completedCount}
          loading={loading}
          subtitle="Pós-venda ok"
        />
      </div>

      {!loading && activeOrders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-10 text-center">
          <p className="text-sm font-medium text-[var(--text-h)]">
            Nenhum pedido ativo no fluxo
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Crie o primeiro pedido ou consulte Pedidos Finalizados.
          </p>
          <div className="mt-5">
            <Link to="/cadastro">
              <Button>Criar pedido</Button>
            </Link>
          </div>
        </div>
      ) : null}

      <KanbanBoard orders={orders} loading={loading} />
    </div>
  )
}
