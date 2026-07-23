import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasDatabaseUrl, query } from './pg.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ORDERS_PATH =
  process.env.ORDERS_DATABASE_PATH ||
  path.join(__dirname, '..', 'data', 'orders.json')

function ensureFile() {
  const dir = path.dirname(ORDERS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(ORDERS_PATH)) {
    fs.writeFileSync(ORDERS_PATH, JSON.stringify({ orders: [] }, null, 2), 'utf8')
  }
}

function readFileDb() {
  ensureFile()
  const parsed = JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'))
  return Array.isArray(parsed.orders) ? parsed.orders : []
}

function writeFileDb(orders) {
  ensureFile()
  fs.writeFileSync(ORDERS_PATH, JSON.stringify({ orders }, null, 2), 'utf8')
}

export async function listOrders() {
  if (hasDatabaseUrl()) {
    const result = await query(
      `SELECT data FROM orders ORDER BY updated_at DESC`
    )
    return result.rows.map((r) => r.data)
  }
  return readFileDb()
}

export async function upsertOrder(order) {
  if (!order?.id) throw new Error('Pedido inválido.')
  const now = new Date().toISOString()
  const record = { ...order, updatedAt: now }

  if (hasDatabaseUrl()) {
    await query(
      `
      INSERT INTO orders
        (id, number, client, status, current_stage_id, completed_at, updated_at, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        number = EXCLUDED.number,
        client = EXCLUDED.client,
        status = EXCLUDED.status,
        current_stage_id = EXCLUDED.current_stage_id,
        completed_at = EXCLUDED.completed_at,
        updated_at = EXCLUDED.updated_at,
        data = EXCLUDED.data
    `,
      [
        record.id,
        record.number ?? null,
        record.client ?? null,
        record.status ?? null,
        record.currentStageId ?? null,
        record.completedAt ?? null,
        now,
        JSON.stringify(record),
      ]
    )
    return record
  }

  const orders = readFileDb()
  const idx = orders.findIndex((o) => o.id === order.id)
  if (idx === -1) orders.unshift(record)
  else orders[idx] = record
  writeFileDb(orders)
  return record
}

export async function syncOrders(orders) {
  if (!Array.isArray(orders)) throw new Error('Lista inválida.')

  let synced = 0
  for (const order of orders) {
    if (order?.id) {
      await upsertOrder(order)
      synced += 1
    }
  }

  return { synced, orders: await listOrders() }
}

export async function deleteOrder(orderId) {
  if (hasDatabaseUrl()) {
    const result = await query(`DELETE FROM orders WHERE id = $1`, [orderId])
    return result.rowCount > 0
  }
  const orders = readFileDb()
  const next = orders.filter((o) => o.id !== orderId)
  if (next.length === orders.length) return false
  writeFileDb(next)
  return true
}

export function getOrdersDbPath() {
  if (hasDatabaseUrl()) return 'postgresql (orders)'
  ensureFile()
  return ORDERS_PATH
}
