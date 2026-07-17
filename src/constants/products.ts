import type { ProductType } from '@/types/workflow'

export const PRODUCT_OPTIONS: {
  value: ProductType
  label: string
}[] = [
  { value: 'mini_rastreador', label: 'Mini Rastreador' },
  { value: 'lv12_4g', label: 'LV-12 4G' },
]

export const PRODUCT_LABELS: Record<ProductType, string> = {
  mini_rastreador: 'Mini Rastreador',
  lv12_4g: 'LV-12 4G',
}

export function requiresRenovacao(product: ProductType): boolean {
  return product === 'mini_rastreador'
}
