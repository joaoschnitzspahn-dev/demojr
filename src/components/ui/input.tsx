import * as React from 'react'
import { cn } from '@/utils/cn'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-h)] outline-none transition-colors placeholder:text-[var(--text-muted)] hover:border-[#d4d4d8] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/15',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
