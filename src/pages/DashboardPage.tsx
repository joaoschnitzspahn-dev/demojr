import * as React from 'react'
import { Plus } from 'lucide-react'
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
  isActiveBoardOrder,
} from '@/services/workflowService'

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
    () =>
      orders.reduce((acc, o) => acc + getDueReminders(o).length, 0),
    [orders]
  )

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Pedidos ativos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Fluxo operacional: Cadastro → Expedição → Entrega → Recebimento →
            Pós-venda.
          </p>
        </div>

        <Link to="/cadastro">
          <Button>
            <Plus className="h-3.5 w-3.5" />
            Cadastrar pedido
          </Button>
        </Link>
      </div>

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
          subtitle="Processos 2–5"
        />
        <StatCard
          title="Alertas"
          value={dueAlerts}
          loading={loading}
          subtitle="Tarefas vencidas"
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
