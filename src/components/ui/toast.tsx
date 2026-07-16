import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

const subscribers = new Set<(toast: ToastItem) => void>()

function emit(toast: ToastItem) {
  for (const cb of subscribers) cb(toast)
}

export const toast = {
  success: (title: string, description?: string) => {
    emit({ id: crypto.randomUUID(), variant: 'success', title, description })
  },
  error: (title: string, description?: string) => {
    emit({ id: crypto.randomUUID(), variant: 'error', title, description })
  },
  info: (title: string, description?: string) => {
    emit({ id: crypto.randomUUID(), variant: 'info', title, description })
  },
}

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([])

  React.useEffect(() => {
    const cb = (t: ToastItem) => {
      setItems((prev) => [t, ...prev].slice(0, 3))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id))
      }, 2800)
    }
    subscribers.add(cb)
    return () => {
      subscribers.delete(cb)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[60] flex w-[340px] max-w-[calc(100vw-24px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'pointer-events-auto rounded-xl border bg-white px-4 py-3 shadow-[var(--shadow)]',
              t.variant === 'success' && 'border-[var(--success-border)]',
              t.variant === 'error' && 'border-red-200',
              t.variant === 'info' && 'border-[var(--accent-border)]'
            )}
          >
            <div
              className={cn(
                'text-sm font-medium',
                t.variant === 'success' && 'text-[var(--success)]',
                t.variant === 'error' && 'text-[var(--danger)]',
                t.variant === 'info' && 'text-[var(--accent)]'
              )}
            >
              {t.title}
            </div>
            {t.description ? (
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                {t.description}
              </div>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
