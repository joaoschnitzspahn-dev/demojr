import type { InvoiceAttachment } from '@/types/workflow'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function uploadInvoiceFile(input: {
  orderId: string
  file: File
  uploadedBy: string
}): Promise<{ ok: true; data: InvoiceAttachment } | { ok: false; error: string }> {
  try {
    const buffer = await input.file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!)
    }
    const base64 = btoa(binary)

    const res = await fetch(`${API_BASE}/api/uploads/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: input.orderId,
        fileName: input.file.name,
        mimeType: input.file.type || 'application/octet-stream',
        base64,
        uploadedBy: input.uploadedBy,
      }),
    })

    const json = (await res.json()) as {
      ok: boolean
      data?: InvoiceAttachment
      error?: string
    }

    if (!res.ok || !json.ok || !json.data) {
      return { ok: false, error: json.error || 'Falha no upload da Nota Fiscal.' }
    }

    return { ok: true, data: json.data }
  } catch {
    return {
      ok: false,
      error: 'Servidor indisponível para upload. Inicie a API (npm run server).',
    }
  }
}
