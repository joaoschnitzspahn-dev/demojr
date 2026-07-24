import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads')

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
})

export const uploadsRouter = Router()

uploadsRouter.post('/invoice', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ ok: false, error: 'Arquivo maior que 12 MB.' })
      }
      return res.status(400).json({ ok: false, error: err.message })
    }
    if (err) {
      console.error('[uploads] multer:', err)
      return res.status(500).json({ ok: false, error: 'Falha no upload.' })
    }

    try {
      const orderId = String(req.body?.orderId || '')
      const uploadedBy = String(req.body?.uploadedBy || 'Sistema')
      const file = req.file

      // Compatibilidade: JSON base64 (clientes antigos)
      if (!file && req.body?.base64) {
        const fileName = String(req.body.fileName || 'nota-fiscal')
        const mimeType = String(req.body.mimeType || 'application/octet-stream')
        if (!orderId || !fileName) {
          return res.status(400).json({
            ok: false,
            error: 'orderId e fileName são obrigatórios.',
          })
        }
        const buffer = Buffer.from(String(req.body.base64), 'base64')
        return saveAndRespond({
          res,
          orderId,
          fileName,
          mimeType,
          buffer,
          uploadedBy,
        })
      }

      if (!orderId || !file) {
        return res.status(400).json({
          ok: false,
          error: 'orderId e arquivo são obrigatórios.',
        })
      }

      return saveAndRespond({
        res,
        orderId,
        fileName: file.originalname || 'nota-fiscal',
        mimeType: file.mimetype || 'application/octet-stream',
        buffer: file.buffer,
        uploadedBy,
      })
    } catch (e) {
      console.error('[uploads] erro:', e)
      return res.status(500).json({ ok: false, error: 'Falha no upload.' })
    }
  })
})

function saveAndRespond({
  res,
  orderId,
  fileName,
  mimeType,
  buffer,
  uploadedBy,
}) {
  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ ok: false, error: 'Arquivo vazio.' })
  }
  if (buffer.length > 12 * 1024 * 1024) {
    return res.status(400).json({ ok: false, error: 'Arquivo maior que 12 MB.' })
  }

  const safeName = String(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120)
  const storageKey = `${orderId}-${Date.now()}-${safeName}`
  ensureUploadsDir()

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
}

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
