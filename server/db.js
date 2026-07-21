import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(__dirname, '..', 'data', 'finished-orders.json')

function ensureDbFile() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ orders: [] }, null, 2), 'utf8')
  }
}

function readDb() {
  ensureDbFile()
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.orders)) {
    return { orders: [] }
  }
  return parsed
}

function writeDb(data) {
  ensureDbFile()
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function listFinishedOrders() {
  return readDb().orders.sort(
    (a, b) =>
      new Date(b.completedAt || b.updatedAt || 0).getTime() -
      new Date(a.completedAt || a.updatedAt || 0).getTime()
  )
}

export function upsertFinishedOrder(order) {
  const db = readDb()
  const now = new Date().toISOString()
  const idx = db.orders.findIndex((o) => o.id === order.id)

  const record = {
    ...order,
    updatedAt: now,
    syncedAt: now,
  }

  if (idx === -1) {
    db.orders.unshift(record)
  } else {
    db.orders[idx] = { ...db.orders[idx], ...record }
  }

  writeDb(db)
  return record
}

export function deleteFinishedOrder(orderId) {
  const db = readDb()
  const before = db.orders.length
  db.orders = db.orders.filter((o) => o.id !== orderId)
  if (db.orders.length === before) return false
  writeDb(db)
  return true
}

export function getDbPath() {
  ensureDbFile()
  return DB_PATH
}
