import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-soft)]',
        secondary:
          'bg-[var(--bg-muted)] text-[var(--text-h)] hover:bg-[var(--border)]',
        ghost:
          'bg-transparent text-[var(--text)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-h)]',
        outline:
          'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-h)] hover:bg-[var(--bg-muted)]',
        destructive:
          'bg-[var(--danger)] text-white hover:bg-[#b91c1c]',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-4',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
