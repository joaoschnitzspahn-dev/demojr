import type { ChecklistItem } from '@/types/workflow'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'

const PRONTOSOFT_ITEM_ID = 'prontosoft'

export default function StageChecklist({
  items,
  onToggle,
  disabled,
  prontosoftOrderNumber = '',
  onProntosoftChange,
}: {
  items: ChecklistItem[]
  onToggle: (itemId: string, checked: boolean) => void
  disabled?: boolean
  prontosoftOrderNumber?: string
  onProntosoftChange?: (value: string) => void
}) {
  const done = items.filter((i) => i.checked).length
  const total = items.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Progresso</span>
        <span className="font-medium text-[var(--text)]">
          {done}/{total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-muted)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>

      {items.map((it) => {
        const isProntosoft = it.id === PRONTOSOFT_ITEM_ID
        const linked = Boolean(prontosoftOrderNumber.trim())

        if (isProntosoft) {
          return (
            <div
              key={it.id}
              className={cn(
                'rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 transition-colors',
                linked && !disabled && 'border-[var(--accent-border)] bg-[var(--accent-bg)]/40',
                disabled && 'opacity-55'
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={it.checked || linked}
                  disabled
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <div
                      className={cn(
                        'text-sm text-[var(--text-h)]',
                        (it.checked || linked) &&
                          'text-[var(--text-muted)] line-through'
                      )}
                    >
                      {it.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {linked
                        ? `Vinculado ao cliente · ${prontosoftOrderNumber.trim()}`
                        : 'Obrigatório — informe o nº gerado na Prontosoft'}
                    </div>
                  </div>
                  <Input
                    className="font-mono"
                    value={prontosoftOrderNumber}
                    disabled={disabled}
                    placeholder="Ex.: PS-2026-00042"
                    autoComplete="off"
                    onChange={(e) => onProntosoftChange?.(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          )
        }

        return (
          <label
            key={it.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 transition-colors',
              !disabled && 'cursor-pointer hover:bg-[var(--bg-muted)]',
              disabled && 'cursor-not-allowed opacity-55',
              it.checked &&
                !disabled &&
                'border-[var(--accent-border)] bg-[var(--accent-bg)]/40'
            )}
          >
            <Checkbox
              checked={it.checked}
              disabled={disabled}
              onCheckedChange={(v) => onToggle(it.id, Boolean(v))}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-sm text-[var(--text-h)]',
                  it.checked && 'text-[var(--text-muted)] line-through'
                )}
              >
                {it.label}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {it.required ? 'Obrigatório' : 'Opcional'}
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
}
