import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finishedOrdersRouter } from './routes/finishedOrders.js'
import { usersRouter } from './routes/users.js'
import { getDbPath } from './db.js'
import { getUsersDbPath } from './usersDb.js'
import { PORT } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const isProd = process.env.NODE_ENV === 'production'

const app = express()

app.use(cors())
app.use(express.json({ limit: '4mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: getDbPath(),
    usersDatabase: getUsersDbPath(),
    mode: isProd ? 'production' : 'development',
  })
})

app.use('/api/finished-orders', finishedOrdersRouter)
app.use('/api/users', usersRouter)

if (isProd) {
  const distPath = path.join(rootDir, 'dist')
  app.use(express.static(distPath))

  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[Sistema Infra] API em http://localhost:${PORT}`)
  console.log(`[Sistema Infra] Banco: ${getDbPath()}`)
  if (isProd) {
    console.log('[Sistema Infra] Servindo frontend em modo produção')
  }
})
