import * as React from 'react'
import { cn } from '@/utils/cn'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors placeholder:text-[var(--text-muted)] hover:border-[#d4d4d8] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/15',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
