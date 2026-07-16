import * as React from 'react'
import { cn } from '@/utils/cn'

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'accent' | 'neutral' | 'success' | 'warning' | 'locked'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:
    'bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]',
  accent:
    'bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]',
  neutral:
    'bg-[var(--bg-muted)] text-[var(--text)] border border-[var(--border)]',
  success:
    'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]',
  warning:
    'bg-[var(--warning-bg)] text-[var(--warning)] border border-amber-200',
  locked:
    'bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border)]',
}

export function Badge({
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}
