import type { InvoiceAttachment } from '@/types/workflow'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export async function uploadInvoiceFile(input: {
  orderId: string
  file: File
  uploadedBy: string
}): Promise<{ ok: true; data: InvoiceAttachment } | { ok: false; error: string }> {
  if (input.file.size > 12 * 1024 * 1024) {
    return { ok: false, error: 'Arquivo maior que 12 MB.' }
  }

  try {
    const form = new FormData()
    form.append('file', input.file)
    form.append('orderId', input.orderId)
    form.append('uploadedBy', input.uploadedBy)

    const res = await fetch(`${API_BASE}/uploads/invoice`, {
      method: 'POST',
      body: form,
    })

    const text = await res.text()
    let json: {
      ok?: boolean
      data?: InvoiceAttachment
      error?: string
    } = {}
    try {
      json = text ? (JSON.parse(text) as typeof json) : {}
    } catch {
      return {
        ok: false,
        error: `Resposta inválida do servidor (HTTP ${res.status}). Tente novamente.`,
      }
    }

    if (!res.ok || !json.ok || !json.data) {
      return {
        ok: false,
        error: json.error || `Falha no upload da Nota Fiscal (HTTP ${res.status}).`,
      }
    }

    return { ok: true, data: json.data }
  } catch {
    return {
      ok: false,
      error:
        'Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.',
    }
  }
}
