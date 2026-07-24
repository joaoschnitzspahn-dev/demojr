import * as React from 'react'
import { Bell, BellRing } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOrdersStore } from '@/store/ordersStore'
import { useInitializeOrders } from '@/hooks/useInitializeOrders'
import { useStalledOrderNotifications } from '@/hooks/useStalledOrderNotifications'
import {
  getStalledOrderAlerts,
  isActiveBoardOrder,
} from '@/services/workflowService'
import {
  canUseBrowserNotifications,
  getBrowserNotificationBlockReason,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  STALLED_ORDER_MINUTES,
} from '@/constants/alerts'
import { formatDate, formatTime } from '@/utils/date'

export default function CentralAlertasPage() {
  useInitializeOrders()
  const orders = useOrdersStore((s) => s.orders)
  const selectOrder = useOrdersStore((s) => s.selectOrder)
  const [now, setNow] = React.useState(() => Date.now())
  const [notifPermission, setNotifPermission] = React.useState<string>('default')
  const [feedback, setFeedback] = React.useState<string | null>(null)

  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  React.useEffect(() => {
    if (!('Notification' in window)) {
      setNotifPermission('unsupported')
      return
    }
    if (!canUseBrowserNotifications()) {
      setNotifPermission('insecure')
      return
    }
    setNotifPermission(Notification.permission)
  }, [])

  const active = React.useMemo(
    () => orders.filter(isActiveBoardOrder),
    [orders]
  )
  const alerts = React.useMemo(
    () => getStalledOrderAlerts(active, now),
    [active, now]
  )
  useStalledOrderNotifications(alerts)

  async function enableBrowserNotifications() {
    setFeedback(null)
    const result = await requestBrowserNotificationPermission()
    setNotifPermission(result)

    if (result === 'insecure') {
      setFeedback(getBrowserNotificationBlockReason())
      return
    }
    if (result === 'unsupported') {
      setFeedback('Este navegador não suporta notificações.')
      return
    }
    if (result === 'denied') {
      setFeedback(
        'Permissão negada. No Chrome: cadeado ao lado da URL → Notificações → Permitir.'
      )
      return
    }
    if (result === 'granted') {
      const sample = alerts[0]
      showBrowserNotification({
        title: sample ? 'Pedido parado' : 'Notificações ativas',
        body: sample
          ? `${sample.orderNumber} · ${sample.client} — ${sample.message}`
          : 'Você receberá alertas quando um pedido ficar parado.',
        tag: sample?.id ?? 'notif-enabled',
      })
      setFeedback('Notificações do Chrome liberadas.')
    }
  }

  const blockReason = getBrowserNotificationBlockReason()
  const canRequest =
    canUseBrowserNotifications() && notifPermission !== 'granted'

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Central de Alertas
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Pedidos sem movimentação há mais de {STALLED_ORDER_MINUTES} minutos.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void enableBrowserNotifications()}
          disabled={notifPermission === 'granted'}
        >
          <BellRing className="h-3.5 w-3.5" />
          {notifPermission === 'granted'
            ? 'Notificações liberadas'
            : canRequest
              ? 'Ativar notificações do Chrome'
              : 'Ver status das notificações'}
        </Button>
      </div>

      {feedback || blockReason ? (
        <Card className="mt-4 border-amber-200 bg-[var(--warning-bg)]">
          <CardContent className="p-4 text-sm text-[var(--text)]">
            {feedback ?? blockReason}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Alertas ativos
            </div>
            <div className="mt-1.5 text-2xl font-semibold text-[var(--text-h)]">
              {alerts.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Pedidos ativos
            </div>
            <div className="mt-1.5 text-2xl font-semibold text-[var(--text-h)]">
              {active.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Notificações do navegador
            </div>
            <div className="mt-1.5 text-sm font-medium text-[var(--text-h)]">
              {notifPermission === 'granted'
                ? 'Ativas — Chrome notifica pedidos parados'
                : notifPermission === 'insecure'
                  ? 'Requer HTTPS'
                  : notifPermission === 'unsupported'
                    ? 'Não suportado neste navegador'
                    : notifPermission === 'denied'
                      ? 'Bloqueadas no Chrome'
                      : 'Aguardando liberação'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Pedidos parados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum pedido parado no momento.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {alert.orderNumber}
                      </span>
                      <Badge variant="neutral">{alert.stageLabel}</Badge>
                      <Badge variant="accent">
                        {alert.minutesIdle} min parado
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--text-h)]">
                      {alert.client}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {alert.message} · detectado{' '}
                      {formatDate(alert.createdAt)} {formatTime(alert.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectOrder(alert.orderId)}
                  >
                    Abrir pedido
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Voltar para{' '}
        <Link to="/" className="text-[var(--accent)] hover:underline">
          Pedidos
        </Link>
        .
      </p>
    </div>
  )
}
