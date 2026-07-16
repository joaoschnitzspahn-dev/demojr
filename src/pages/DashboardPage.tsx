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
import { getOrderStatus } from '@/services/workflowService'

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
      orders.filter(
        (o) => o.currentStageId === 1 && getOrderStatus(o) !== 'Concluídos'
      ).length,
    [orders]
  )
  const inProgressCount = React.useMemo(
    () => orders.filter((o) => getOrderStatus(o) === 'Em Andamento').length,
    [orders]
  )

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Acompanhe o fluxo operacional em 8 etapas fixas.
          </p>
        </div>

        <Link to="/cadastro">
          <Button>
            <Plus className="h-3.5 w-3.5" />
            Cadastrar pedido
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pedidos hoje"
          value={todayCount}
          loading={loading}
          subtitle="Criados hoje"
        />
        <StatCard
          title="Pendentes"
          value={pendingCount}
          loading={loading}
          subtitle="Recebimento"
        />
        <StatCard
          title="Em andamento"
          value={inProgressCount}
          loading={loading}
          subtitle="Etapas 2–7"
        />
        <StatCard
          title="Concluídos"
          value={completedCount}
          loading={loading}
          subtitle="Fluxo finalizado"
        />
      </div>

      {!loading && orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-10 text-center">
          <p className="text-sm font-medium text-[var(--text-h)]">
            Nenhum pedido no fluxo
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Crie o primeiro pedido para iniciar.
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
