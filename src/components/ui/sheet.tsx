import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'right' | 'left' | 'top' | 'bottom'
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        {...props}
        className={cn(
          'fixed z-50 border-[var(--border)] bg-[var(--bg-elevated)] p-0 shadow-[0_8px_30px_rgba(16,24,40,0.08)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'right' &&
            'inset-y-0 right-0 h-full w-[min(520px,100vw)] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          side === 'left' &&
            'inset-y-0 left-0 h-full w-[min(520px,100vw)] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'top' && 'inset-x-0 top-0 w-full border-b',
          side === 'bottom' && 'inset-x-0 bottom-0 w-full border-t',
          className
        )}
      >
        <div className="flex h-full flex-col">{children}</div>
        <DialogPrimitive.Close
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-h)]"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
