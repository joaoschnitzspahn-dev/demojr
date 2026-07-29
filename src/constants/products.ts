import type { ProductType } from '@/types/workflow'

export const PRODUCT_OPTIONS: {
  value: ProductType
  label: string
}[] = [
  { value: 'mini_rastreador', label: 'Mini Rastreador' },
  { value: 'lv12_4g', label: 'LV-12 4G' },
  { value: 'kit_adesao', label: 'Kit de Adesão' },
]

export const PRODUCT_LABELS: Record<ProductType, string> = {
  mini_rastreador: 'Mini Rastreador',
  lv12_4g: 'LV-12 4G',
  kit_adesao: 'Kit de Adesão',
}

export function requiresRenovacao(product: ProductType): boolean {
  return product === 'mini_rastreador'
}

/**
 * LV-12 4G e Kit de Adesão não passam pelo Acompanhamento da Entrega (etapa 4):
 * Expedição (3) → Confirmação de Recebimento (5).
 */
export function skipsDeliveryTracking(product: ProductType): boolean {
  return product === 'lv12_4g' || product === 'kit_adesao'
}
