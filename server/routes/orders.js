import { Router } from 'express'
import {
  deleteOrder,
  listOrders,
  syncOrders,
  upsertOrder,
} from '../ordersDb.js'
import { verifyAdmin, verifyApiKey } from '../auth.js'

const router = Router()

function requireApiKey(req, res, next) {
  if (!verifyApiKey(req)) {
    return res.status(401).json({ error: 'Chave de API inválida.' })
  }
  next()
}

router.get('/', requireApiKey, async (_req, res) => {
  try {
    res.json({ orders: await listOrders() })
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Erro ao listar pedidos.',
    })
  }
})

router.post('/', requireApiKey, async (req, res) => {
  const { order } = req.body ?? {}
  if (!order?.id) {
    return res.status(400).json({ error: 'Pedido inválido.' })
  }

  try {
    const saved = await upsertOrder(order)
    res.json({ ok: true, order: saved })
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Erro ao salvar pedido.',
    })
  }
})

router.post('/sync', requireApiKey, async (req, res) => {
  const { orders } = req.body ?? {}
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Lista de pedidos inválida.' })
  }

  try {
    const result = await syncOrders(orders)
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Erro ao sincronizar pedidos.',
    })
  }
})

router.delete('/:id', requireApiKey, async (req, res) => {
  if (!verifyAdmin(req)) {
    return res
      .status(403)
      .json({ error: 'Apenas o administrador pode excluir.' })
  }

  try {
    const deleted = await deleteOrder(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Pedido não encontrado.' })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Erro ao excluir pedido.',
    })
  }
})

export { router as ordersRouter }
