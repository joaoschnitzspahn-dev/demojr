import { useEffect } from 'react'
import { useOrdersStore } from '@/store/ordersStore'

export function useInitializeOrders() {
  const initialize = useOrdersStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])
}

