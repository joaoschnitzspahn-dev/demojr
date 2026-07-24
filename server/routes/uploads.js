import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads')

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

export const uploadsRouter = Router()

uploadsRouter.post('/invoice', (req, res) => {
  try {
    const { orderId, fileName, mimeType, base64, uploadedBy } = req.body ?? {}

    if (!orderId || !fileName || !base64) {
      return res.status(400).json({
        ok: false,
        error: 'orderId, fileName e base64 são obrigatórios.',
      })
    }

    const safeName = String(fileName)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120)
    const storageKey = `${orderId}-${Date.now()}-${safeName}`
    ensureUploadsDir()

    const buffer = Buffer.from(String(base64), 'base64')
    if (buffer.length === 0) {
      return res.status(400).json({ ok: false, error: 'Arquivo vazio.' })
    }
    if (buffer.length > 12 * 1024 * 1024) {
      return res
        .status(400)
        .json({ ok: false, error: 'Arquivo maior que 12 MB.' })
    }

    const filePath = path.join(uploadsDir, storageKey)
    fs.writeFileSync(filePath, buffer)

    const uploadedAt = new Date().toISOString()
    return res.json({
      ok: true,
      data: {
        fileName: String(fileName),
        uploadedAt,
        uploadedBy: uploadedBy || 'Sistema',
        url: `/api/uploads/file/${encodeURIComponent(storageKey)}`,
        storageKey,
        mimeType: mimeType || 'application/octet-stream',
        size: buffer.length,
      },
    })
  } catch (e) {
    console.error('[uploads] erro:', e)
    return res.status(500).json({ ok: false, error: 'Falha no upload.' })
  }
})

uploadsRouter.get('/file/:storageKey', (req, res) => {
  try {
    ensureUploadsDir()
    const storageKey = path.basename(req.params.storageKey)
    const filePath = path.join(uploadsDir, storageKey)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Arquivo não encontrado.' })
    }
    return res.sendFile(filePath)
  } catch (e) {
    console.error('[uploads] read erro:', e)
    return res.status(500).json({ ok: false, error: 'Falha ao ler arquivo.' })
  }
})
