import * as React from 'react'
import type { Order, WorkflowStageId } from '@/types/workflow'
import { WORKFLOW_STAGE_ORDER, WORKFLOW_STAGES } from '@/constants/workflowStages'
import OrderKanbanCard from '@/components/orders/OrderKanbanCard'
import { Skeleton } from '@/components/ui/skeleton'

function StageColumn({
  stageId,
  orders,
  loading,
}: {
  stageId: WorkflowStageId
  orders: Order[]
  loading: boolean
}) {
  return (
    <section className="w-[260px] min-w-[260px] max-w-[260px] space-y-2.5">
      <header className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Etapa {stageId}
          </div>
          <div className="truncate text-sm font-medium text-[var(--text-h)]">
            {WORKFLOW_STAGES[stageId].title}
          </div>
        </div>
        <div className="rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">
          {loading ? '—' : orders.length}
        </div>
      </header>

      <div className="h-[calc(100vh-280px)] space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]/50 p-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] w-full" />
          ))
        ) : orders.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-xs text-[var(--text-muted)]">
            Sem pedidos
          </div>
        ) : (
          orders.map((o) => (
            <OrderKanbanCard key={o.id} order={o} stageId={stageId} />
          ))
        )}
      </div>
    </section>
  )
}

export default function KanbanBoard({
  orders,
  loading,
}: {
  orders: Order[]
  loading: boolean
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<WorkflowStageId, Order[]>()
    for (const sid of WORKFLOW_STAGE_ORDER) map.set(sid, [])
    for (const order of orders) {
      map.get(order.currentStageId)?.push(order)
    }
    return map
  }, [orders])

  return (
    <div className="mt-6">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {WORKFLOW_STAGE_ORDER.map((stageId) => (
          <StageColumn
            key={stageId}
            stageId={stageId}
            orders={grouped.get(stageId) ?? []}
            loading={loading}
          />
        ))}
      </div>
    </div>
  )
}
