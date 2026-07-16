import { Check, Lock, Circle } from 'lucide-react'
import { WORKFLOW_STAGE_ORDER, WORKFLOW_STAGES } from '@/constants/workflowStages'
import { getStageState } from '@/services/workflowService'
import type { Order } from '@/types/workflow'
import { cn } from '@/utils/cn'

export default function StagePipeline({ order }: { order: Order }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-1">
        {WORKFLOW_STAGE_ORDER.map((stageId, index) => {
          const state = getStageState(order, stageId)
          const title = WORKFLOW_STAGES[stageId].title

          return (
            <div key={stageId} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium',
                  state === 'active' &&
                    'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent)]',
                  state === 'completed' &&
                    'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]',
                  state === 'locked' &&
                    'border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-muted)]'
                )}
                title={
                  state === 'locked'
                    ? 'Bloqueada'
                    : state === 'completed'
                      ? 'Concluída'
                      : 'Ativa'
                }
              >
                {state === 'completed' ? (
                  <Check className="h-3 w-3" />
                ) : state === 'locked' ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                )}
                <span>
                  {stageId}. {title}
                </span>
              </div>
              {index < WORKFLOW_STAGE_ORDER.length - 1 ? (
                <div
                  className={cn(
                    'h-px w-2.5',
                    state === 'completed'
                      ? 'bg-[var(--success)]/40'
                      : 'bg-[var(--border)]'
                  )}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
