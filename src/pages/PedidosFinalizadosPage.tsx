import * as React from 'react'
import { Cloud, CloudOff, Loader2, Search, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersStore } from '@/store/ordersStore'
import { useAuthStore } from '@/store/authStore'
import { isAdminUser } from '@/constants/users'
import { useInitializeOrders } from '@/hooks/useInitializeOrders'
import { PRODUCT_LABELS } from '@/constants/products'
import { formatDate } from '@/utils/date'
import { toast } from '@/components/ui/toast'
import type { Order } from '@/types/workflow'

function matchesQuery(order: Order, q: string) {
  if (!q.trim()) return true
  const needle = q.trim().toLowerCase()
  const haystack = [
    order.client,
    order.cpf,
    order.email,
    order.number,
    order.prontosoftOrderNumber ?? '',
    order.trackingCode,
    order.product,
    PRODUCT_LABELS[order.product],
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
  const syncingFinished = useOrdersStore((s) => s.syncingFinished)
  const serverOnline = useOrdersStore((s) => s.serverOnline)
  const selectOrder = useOrdersStore((s) => s.selectOrder)
  const deleteFinishedOrder = useOrdersStore((s) => s.deleteFinishedOrder)
  const syncFinishedFromServer = useOrdersStore((s) => s.syncFinishedFromServer)
  const currentUser = useAuthStore((s) => s.currentUser)
  const isAdmin = isAdminUser(currentUser)

  const [query, setQuery] = React.useState('')
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

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

  async function handleRefresh() {
    const result = await syncFinishedFromServer()
    if (result.ok) {
      toast.success('Sincronizado', 'Pedidos finalizados atualizados do servidor.')
    } else {
      toast.error('Servidor offline', result.error ?? 'Tente novamente.')
    }
  }

  async function handleDelete(order: Order, e: React.MouseEvent) {
    e.stopPropagation()

    const confirmed = window.confirm(
      `Excluir permanentemente o pedido ${order.number} (${order.client})?\n\nEsta ação remove o registro do banco central.`
    )
    if (!confirmed) return

    setDeletingId(order.id)
    const result = await deleteFinishedOrder(order.id)
    setDeletingId(null)

    if (!result.ok) {
      toast.error('Não foi possível excluir', result.error)
      return
    }

    if (result.warning) {
      toast.info('Pedido removido', result.warning)
      return
    }

    toast.success('Pedido excluído', `${order.number} removido do arquivo.`)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Pedidos Finalizados
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Arquivo central de pedidos concluídos. Sincronização automática a
            cada 10 horas. Somente o administrador (adm) pode excluir pedidos
            finalizados.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {syncingFinished ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sincronizando...
              </>
            ) : serverOnline === true ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                Banco central conectado
              </>
            ) : serverOnline === false ? (
              <>
                <CloudOff className="h-3.5 w-3.5 text-amber-600" />
                Servidor offline — exibindo cache local
              </>
            ) : null}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => void handleRefresh()}>
          {syncingFinished ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Cloud className="h-3.5 w-3.5" />
          )}
          Atualizar do servidor
        </Button>
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
            <div
              key={order.id}
              className="flex w-full flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 transition-colors hover:bg-[var(--bg-card-hover)] sm:flex-row sm:items-center sm:justify-between"
            >
              <button
                type="button"
                onClick={() => selectOrder(order.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {order.number}
                  </span>
                  <Badge variant="success">Finalizado</Badge>
                  <Badge variant="neutral">
                    {PRODUCT_LABELS[order.product]}
                  </Badge>
                  {order.stages[7]?.scheduledFor &&
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
              </button>

              <div className="flex shrink-0 items-center gap-3">
                <div className="text-left text-xs text-[var(--text-muted)] sm:text-right">
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

                {isAdmin ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={deletingId === order.id}
                    onClick={(e) => void handleDelete(order, e)}
                    title="Excluir pedido (admin)"
                  >
                    {deletingId === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
