import { Router } from 'express'
import {
  deleteFinishedOrder,
  listFinishedOrders,
  upsertFinishedOrder,
} from '../db.js'
import { verifyAdmin, verifyApiKey } from '../auth.js'

const router = Router()

function requireApiKey(req, res, next) {
  if (!verifyApiKey(req)) {
    return res.status(401).json({ error: 'Chave de API inválida.' })
  }
  next()
}

router.get('/', requireApiKey, (_req, res) => {
  res.json({ orders: listFinishedOrders() })
})

router.post('/', requireApiKey, (req, res) => {
  const { order } = req.body ?? {}

  if (!order?.id || !order.completedAt) {
    return res.status(400).json({
      error: 'Pedido inválido. Envie um pedido finalizado completo.',
    })
  }

  const saved = upsertFinishedOrder(order)
  res.json({ ok: true, order: saved })
})

router.post('/sync', requireApiKey, (req, res) => {
  const { orders } = req.body ?? {}

  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Lista de pedidos inválida.' })
  }

  let synced = 0
  for (const order of orders) {
    if (order?.id && order.completedAt) {
      upsertFinishedOrder(order)
      synced += 1
    }
  }

  res.json({ ok: true, synced, orders: listFinishedOrders() })
})

router.delete('/:id', requireApiKey, (req, res) => {
  if (!verifyAdmin(req)) {
    return res.status(403).json({ error: 'Apenas o administrador pode excluir.' })
  }

  const deleted = deleteFinishedOrder(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: 'Pedido não encontrado.' })
  }

  res.json({ ok: true })
})

export { router as finishedOrdersRouter }
