/** Pedido parado sem movimentação (15 minutos). */
export const STALLED_ORDER_MINUTES = 15
export const STALLED_ORDER_MS = STALLED_ORDER_MINUTES * 60 * 1000

export type BrowserNotificationPayload = {
  title: string
  body: string
  tag?: string
}

export function isSecureNotificationContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true
}

export function canUseBrowserNotifications(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    isSecureNotificationContext()
  )
}

export function getBrowserNotificationBlockReason(): string | null {
  if (typeof window === 'undefined') return 'Ambiente sem navegador.'
  if (!('Notification' in window)) {
    return 'Este navegador não suporta notificações.'
  }
  if (!isSecureNotificationContext()) {
    return 'O Chrome só libera notificações em HTTPS. Acesse pelo domínio seguro (não pelo IP http://).'
  }
  if (Notification.permission === 'denied') {
    return 'Notificações bloqueadas no Chrome. Libere em Configurações do site.'
  }
  return null
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported' | 'insecure'
> {
  if (!('Notification' in window)) return 'unsupported'
  if (!isSecureNotificationContext()) return 'insecure'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function showBrowserNotification(
  payload: BrowserNotificationPayload
): boolean {
  if (!canUseBrowserNotifications()) return false
  if (Notification.permission !== 'granted') return false

  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return true
  } catch {
    return false
  }
}

/** @deprecated use showBrowserNotification */
export function prepareBrowserNotification(
  payload: BrowserNotificationPayload
): BrowserNotificationPayload {
  return payload
}

/** @deprecated use showBrowserNotification */
export function maybeShowBrowserNotification(
  payload: BrowserNotificationPayload
): void {
  showBrowserNotification(payload)
}
