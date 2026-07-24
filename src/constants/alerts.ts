/** Pedido parado sem movimentação (15 minutos). */
export const STALLED_ORDER_MINUTES = 15
export const STALLED_ORDER_MS = STALLED_ORDER_MINUTES * 60 * 1000

/**
 * Preparação para Chrome Notification API.
 * Não dispara notificação real ainda — só expõe o contrato.
 */
export type BrowserNotificationPayload = {
  title: string
  body: string
  tag?: string
}

export function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!canUseBrowserNotifications()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

/** Stub — ativar depois quando for liberar push no Chrome. */
export function prepareBrowserNotification(
  payload: BrowserNotificationPayload
): BrowserNotificationPayload {
  return payload
}

export function maybeShowBrowserNotification(
  _payload: BrowserNotificationPayload
): void {
  // Futuro: if (Notification.permission === 'granted') new Notification(...)
}
