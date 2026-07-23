import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finishedOrdersRouter } from './routes/finishedOrders.js'
import { usersRouter } from './routes/users.js'
import { ordersRouter } from './routes/orders.js'
import { getDbPath } from './db.js'
import { getUsersDbPath } from './usersDb.js'
import { getOrdersDbPath } from './ordersDb.js'
import { getDatabaseInfo, initDatabase } from './pg.js'
import { PORT } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const isProd = process.env.NODE_ENV === 'production'

const app = express()

app.use(cors())
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', async (_req, res) => {
  const dbInfo = await getDatabaseInfo()
  res.json({
    ok: true,
    mode: isProd ? 'production' : 'development',
    database: dbInfo,
    paths: {
      finishedOrders: getDbPath(),
      users: getUsersDbPath(),
      orders: getOrdersDbPath(),
    },
  })
})

app.use('/api/finished-orders', finishedOrdersRouter)
app.use('/api/users', usersRouter)
app.use('/api/orders', ordersRouter)

if (isProd) {
  const distPath = path.join(rootDir, 'dist')
  app.use(express.static(distPath))

  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

async function start() {
  try {
    await initDatabase()
  } catch (e) {
    console.error('[Sistema Infra] Falha ao iniciar banco:', e)
    if (isProd && process.env.DATABASE_URL) {
      process.exit(1)
    }
  }

  app.listen(PORT, () => {
    console.log(`[Sistema Infra] API em http://localhost:${PORT}`)
    console.log(`[Sistema Infra] Pedidos finalizados: ${getDbPath()}`)
    console.log(`[Sistema Infra] Usuários: ${getUsersDbPath()}`)
    console.log(`[Sistema Infra] Pedidos: ${getOrdersDbPath()}`)
    if (isProd) {
      console.log('[Sistema Infra] Servindo frontend em modo produção')
    }
  })
}

start()
