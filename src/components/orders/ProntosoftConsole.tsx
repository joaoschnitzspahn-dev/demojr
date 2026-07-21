import * as React from 'react'
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'

type ProntosoftConsoleProps = {
  field: UseFormRegisterReturn<'prontosoftOrderNumber'>
  value: string
  error?: FieldError
}

export default function ProntosoftConsole({
  field,
  value,
  error,
}: ProntosoftConsoleProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [focused, setFocused] = React.useState(false)
  const trimmed = value.trim()

  const { ref, ...inputProps } = field

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--text-h)]">
        Nº pedido Prontosoft
      </label>

      <div
        role="group"
        aria-label="Console Prontosoft"
        className={[
          'overflow-hidden rounded-xl border bg-[#0f1117] shadow-sm transition-shadow',
          focused
            ? 'border-emerald-500/40 ring-2 ring-emerald-500/15'
            : 'border-zinc-800',
          error ? 'border-red-500/50 ring-2 ring-red-500/10' : '',
        ].join(' ')}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Barra estilo terminal */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-[#16181f] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            prontosoft
          </span>
        </div>

        <div className="space-y-2 px-4 py-3 font-mono text-[13px] leading-relaxed">
          <p className="text-zinc-500">
            <span className="text-zinc-600">$</span> vincular_pedido --sistema-infra
          </p>

          <div className="flex min-h-[28px] items-center gap-2">
            <span className="shrink-0 select-none font-semibold text-emerald-500">
              &gt;
            </span>
            <input
              {...inputProps}
              ref={(el) => {
                ref(el)
                inputRef.current = el
              }}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="PS-2026-00000"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full min-w-0 bg-transparent text-emerald-300 outline-none placeholder:text-zinc-600 placeholder:opacity-100 caret-emerald-400"
            />
            {focused ? (
              <span className="console-cursor hidden shrink-0 text-emerald-400 sm:inline">
                ▌
              </span>
            ) : null}
          </div>

          {trimmed ? (
            <p className="text-[11px] text-emerald-500/70">
              ✓ {trimmed} — pronto para salvar
            </p>
          ) : (
            <p className="text-[11px] text-zinc-600">
              Opcional agora · obrigatório antes de concluir Cadastro
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-[var(--danger)]">{error.message}</p>
      ) : null}
    </div>
  )
}
