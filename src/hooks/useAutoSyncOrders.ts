import { useEffect, useRef } from 'react'
import { AUTO_SYNC_INTERVAL_MS } from '@/constants/autoSync'
import { useAuthStore } from '@/store/authStore'
import { useOrdersStore } from '@/store/ordersStore'

function msSinceLastSync(lastAutoSyncAt: string | null): number {
  if (!lastAutoSyncAt) return Infinity
  return Date.now() - new Date(lastAutoSyncAt).getTime()
}

export function useAutoSyncOrders() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const hydrated = useAuthStore((s) => s.hydrated)
  const autoSync = useOrdersStore((s) => s.autoSync)
  const lastAutoSyncAt = useOrdersStore((s) => s.lastAutoSyncAt)
  const runningRef = useRef(false)

  useEffect(() => {
    if (!hydrated || !currentUser) return

    async function runSync() {
      if (runningRef.current) return
      runningRef.current = true
      try {
        await autoSync()
      } finally {
        runningRef.current = false
      }
    }

    const intervalId = window.setInterval(() => {
      void runSync()
    }, AUTO_SYNC_INTERVAL_MS)

    function onVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        msSinceLastSync(lastAutoSyncAt) >= AUTO_SYNC_INTERVAL_MS
      ) {
        void runSync()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [hydrated, currentUser, autoSync, lastAutoSyncAt])
}
