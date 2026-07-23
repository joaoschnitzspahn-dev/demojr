import { Router } from 'express'
import { listUsers, syncUsers } from '../usersDb.js'
import { verifyApiKey } from '../auth.js'

const router = Router()

function requireApiKey(req, res, next) {
  if (!verifyApiKey(req)) {
    return res.status(401).json({ error: 'Chave de API inválida.' })
  }
  next()
}

router.get('/', requireApiKey, async (_req, res) => {
  try {
    res.json({ users: await listUsers() })
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Erro ao listar usuários.',
    })
  }
})

router.post('/sync', requireApiKey, async (req, res) => {
  const { users } = req.body ?? {}

  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'Lista de usuários inválida.' })
  }

  try {
    const saved = await syncUsers(users)
    res.json({ ok: true, users: saved })
  } catch (e) {
    res.status(400).json({
      error: e instanceof Error ? e.message : 'Erro ao sincronizar usuários.',
    })
  }
})

export { router as usersRouter }
