import { useEffect } from 'react'
import { useOrdersStore } from '@/store/ordersStore'

export function useInitializeOrders() {
  const initialize = useOrdersStore((s) => s.initialize)
  const hydrated = useOrdersStore((s) => s.hydrated)

  useEffect(() => {
    if (!hydrated) return
    void initialize()
  }, [hydrated, initialize])
}
