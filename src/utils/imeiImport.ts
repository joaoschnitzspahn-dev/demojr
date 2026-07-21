import * as XLSX from 'xlsx'

/** Extrai IMEIs de texto livre (linhas, vírgulas, ponto-e-vírgula). */
export function normalizeImeiList(raw: string): string[] {
  const parts = raw
    .split(/[\n\r,;|\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const result: string[] = []

  for (const part of parts) {
    // Remove espaços internos e mantém só dígitos/letras típicos de IMEI
    const cleaned = part.replace(/\s+/g, '')
    if (!cleaned) continue
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    result.push(cleaned)
  }

  return result
}

export function formatImeiList(imeis: string[]): string {
  return imeis.join('\n')
}

function cellLooksLikeImei(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim().replace(/\s+/g, '')
  if (!text) return null
  // IMEI clássico: 14–17 dígitos; aceita também códigos alfanuméricos longos
  if (/^\d{14,17}$/.test(text)) return text
  if (/^[A-Za-z0-9-]{8,32}$/.test(text) && /\d/.test(text)) return text
  return null
}

/**
 * Lê planilha (.xlsx, .xls, .csv) e extrai IMEIs da primeira coluna
 * com cabeçalho "IMEI" (ou similar), ou de todas as células válidas.
 */
export async function parseImeisFromSpreadsheet(file: File): Promise<{
  imeis: string[]
  count: number
}> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { imeis: [], count: 0 }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][]

  if (!rows.length) {
    return { imeis: [], count: 0 }
  }

  const headerRow = rows[0].map((c) => String(c).trim().toLowerCase())
  const imeiColIndex = headerRow.findIndex((h) =>
    /imei|serial|serie|código|codigo|tag/.test(h)
  )

  const collected: string[] = []

  if (imeiColIndex >= 0) {
    for (let i = 1; i < rows.length; i++) {
      const cell = rows[i]?.[imeiColIndex]
      const imei = cellLooksLikeImei(cell)
      if (imei) collected.push(imei)
    }
  } else {
    for (const row of rows) {
      for (const cell of row ?? []) {
        const imei = cellLooksLikeImei(cell)
        if (imei) collected.push(imei)
      }
    }
  }

  const imeis = normalizeImeiList(collected.join('\n'))
  return { imeis, count: imeis.length }
}
