import * as React from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--bg-muted)]',
        className
      )}
      {...props}
    />
  )
}
