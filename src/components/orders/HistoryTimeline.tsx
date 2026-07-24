import type { OrderHistoryEvent } from '@/types/workflow'
import { formatDate, formatTime } from '@/utils/date'
import { cn } from '@/utils/cn'

const typeDot: Record<OrderHistoryEvent['type'], string> = {
  created: 'bg-[var(--accent)]',
  started: 'bg-sky-500',
  completed: 'bg-[var(--success)]',
  released: 'bg-zinc-400',
  scheduled: 'bg-amber-500',
  reminder: 'bg-orange-400',
  field_updated: 'bg-violet-400',
  attachment_uploaded: 'bg-emerald-500',
}

export default function HistoryTimeline({
  events,
}: {
  events: OrderHistoryEvent[]
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-5 text-sm text-[var(--text-muted)]">
        Nenhuma atividade registrada ainda.
      </div>
    )
  }

  const sorted = events
    .slice()
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )

  return (
    <div className="relative space-y-0">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-[var(--border)]" />

      {sorted.map((ev) => (
        <div key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
          <div
            className={cn(
              'relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-[var(--bg-elevated)]',
              typeDot[ev.type]
            )}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-xs font-medium text-[var(--text-h)]">
                {formatTime(ev.occurredAt)}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {formatDate(ev.occurredAt)}
              </span>
              {ev.stageLabel ? (
                <span className="text-[11px] text-[var(--text-muted)]">
                  · {ev.stageLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
              {ev.message}
            </p>
            {ev.responsible ? (
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Responsável: {ev.responsible}
              </p>
            ) : null}
            {ev.notes?.trim() ? (
              <p className="mt-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
                {ev.notes}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
