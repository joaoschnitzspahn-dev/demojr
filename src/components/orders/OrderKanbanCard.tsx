import type { ComponentProps } from 'react'
import { Clock, Lock, User2 } from 'lucide-react'
import type { Order, WorkflowStageId } from '@/types/workflow'
import { formatDuration } from '@/utils/date'
import { getOrderStatus, getStageState } from '@/services/workflowService'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { useOrdersStore } from '@/store/ordersStore'

const statusBadge: Record<
  ReturnType<typeof getOrderStatus>,
  ComponentProps<typeof Badge>['variant']
> = {
  Pendentes: 'neutral',
  'Em Andamento': 'accent',
  Concluídos: 'success',
}

export default function OrderKanbanCard({
  order,
  stageId,
}: {
  order: Order
  stageId: WorkflowStageId
}) {
  const selectOrder = useOrdersStore((s) => s.selectOrder)
  const stageProgress = order.stages[stageId]
  const stageState = getStageState(order, stageId)
  const startedAt = stageProgress.startedAt
  const durationLabel = startedAt
    ? formatDuration(startedAt, stageProgress.finishedAt ?? undefined)
    : '—'
  const status = getOrderStatus(order)

  return (
    <button
      onClick={() => selectOrder(order.id)}
      className={cn(
        'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3.5 text-left shadow-[var(--shadow-sm)] transition-colors duration-150',
        'hover:border-[#d4d4d8] hover:bg-[var(--bg-card-hover)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25',
        stageState === 'active' && 'border-[var(--accent-border)]'
      )}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[11px] font-medium text-[var(--text-muted)]">
              {order.number}
            </div>
            <div className="mt-0.5 truncate text-sm font-medium text-[var(--text-h)]">
              {order.client}
            </div>
          </div>
          <Badge variant={statusBadge[status]}>{status}</Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <User2 className="h-3 w-3" />
            <span className="truncate">{order.currentResponsible}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock className="h-3 w-3" />
            <span>{durationLabel}</span>
          </div>
          {stageState === 'locked' ? (
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Lock className="h-3 w-3" />
              Bloqueada
            </div>
          ) : null}
        </div>
      </div>
    </button>
  )
}
