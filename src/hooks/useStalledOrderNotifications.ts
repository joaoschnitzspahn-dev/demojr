import * as React from 'react'
import type { OrderAlert } from '@/types/workflow'
import {
  canUseBrowserNotifications,
  showBrowserNotification,
} from '@/constants/alerts'

const notifiedKeys = new Set<string>()

/**
 * Dispara notificação do Chrome para cada alerta de pedido parado (1x por alerta).
 */
export function useStalledOrderNotifications(alerts: OrderAlert[]) {
  React.useEffect(() => {
    if (!canUseBrowserNotifications()) return
    if (Notification.permission !== 'granted') return

    for (const alert of alerts) {
      if (notifiedKeys.has(alert.id)) continue
      const ok = showBrowserNotification({
        title: 'Pedido parado',
        body: `${alert.orderNumber} · ${alert.client} — ${alert.message}`,
        tag: alert.id,
      })
      if (ok) notifiedKeys.add(alert.id)
    }

    const activeIds = new Set(alerts.map((a) => a.id))
    for (const key of [...notifiedKeys]) {
      if (!activeIds.has(key)) notifiedKeys.delete(key)
    }
  }, [alerts])
}
