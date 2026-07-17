import * as React from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersStore } from '@/store/ordersStore'
import { useInitializeOrders } from '@/hooks/useInitializeOrders'
import { PRODUCT_LABELS } from '@/constants/products'
import { formatDate } from '@/utils/date'
import type { Order } from '@/types/workflow'

function matchesQuery(order: Order, q: string) {
  if (!q.trim()) return true
  const needle = q.trim().toLowerCase()
  const haystack = [
    order.client,
    order.cpf,
    order.email,
    order.number,
    order.trackingCode,
    order.product,
    PRODUCT_LABELS[order.product],
    order.tags,
    order.imeis,
    order.currentResponsible,
    order.completedAt ? formatDate(order.completedAt) : '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export default function PedidosFinalizadosPage() {
  useInitializeOrders()

  const orders = useOrdersStore((s) => s.orders)
  const loading = useOrdersStore((s) => s.loading)
  const selectOrder = useOrdersStore((s) => s.selectOrder)

  const [query, setQuery] = React.useState('')

  const finished = React.useMemo(
    () =>
      orders
        .filter((o) => Boolean(o.completedAt))
        .filter((o) => matchesQuery(o, query))
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() -
            new Date(a.completedAt!).getTime()
        ),
    [orders, query]
  )

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
          Pedidos Finalizados
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Pedidos com pós-venda concluído. A busca completa estará disponível
          nas próximas integrações.
        </p>
      </div>

      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          className="pl-9"
          placeholder="Buscar por cliente, CPF, e-mail, pedido, rastreio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : finished.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[var(--text-muted)]">
              Nenhum pedido finalizado encontrado.
            </CardContent>
          </Card>
        ) : (
          finished.map((order) => (
            <button
              key={order.id}
              onClick={() => selectOrder(order.id)}
              className="flex w-full flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-left transition-colors hover:bg-[var(--bg-card-hover)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {order.number}
                  </span>
                  <Badge variant="success">Finalizado</Badge>
                  <Badge variant="neutral">
                    {PRODUCT_LABELS[order.product]}
                  </Badge>
                  {order.stages[6]?.scheduledFor &&
                  !order.renovacaoCompletedAt ? (
                    <Badge variant="neutral">Renovação agendada</Badge>
                  ) : null}
                </div>
                <div className="mt-1 truncate text-sm font-medium text-[var(--text-h)]">
                  {order.client}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {order.email} · CPF {order.cpf}
                </div>
              </div>
              <div className="shrink-0 text-left text-xs text-[var(--text-muted)] sm:text-right">
                <div>
                  Concluído em{' '}
                  {order.completedAt ? formatDate(order.completedAt) : '—'}
                </div>
                <div className="mt-0.5">
                  Rastreio:{' '}
                  <span className="font-mono">
                    {order.trackingCode || '—'}
                  </span>
                </div>
                <div className="mt-0.5">
                  Responsável: {order.currentResponsible}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
