import * as React from 'react'
import { Minus, Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PRODUCT_LABELS } from '@/constants/products'
import { STOCK_PRODUCT_ORDER } from '@/constants/stock'
import { useStockStore } from '@/store/stockStore'
import { toast } from '@/components/ui/toast'
import type { ProductType } from '@/types/workflow'

function StockRow({ product }: { product: ProductType }) {
  const quantity = useStockStore((s) => s.getQuantity(product))
  const addStock = useStockStore((s) => s.addStock)
  const removeStock = useStockStore((s) => s.removeStock)
  const [amount, setAmount] = React.useState('1')

  function parseAmount() {
    const n = Math.floor(Number(amount))
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }

  function handleAdd() {
    const n = parseAmount()
    if (n == null) {
      toast.error('Quantidade inválida', 'Informe um valor maior que zero.')
      return
    }
    const result = addStock(product, n)
    if (!result.ok) {
      toast.error('Não foi possível adicionar', result.error)
      return
    }
    toast.success('Entrada registrada', `+${n} em ${PRODUCT_LABELS[product]}.`)
  }

  function handleRemove() {
    const n = parseAmount()
    if (n == null) {
      toast.error('Quantidade inválida', 'Informe um valor maior que zero.')
      return
    }
    const result = removeStock(product, n)
    if (!result.ok) {
      toast.error('Não foi possível remover', result.error)
      return
    }
    toast.success('Saída registrada', `−${n} em ${PRODUCT_LABELS[product]}.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-[var(--accent)]" />
          {PRODUCT_LABELS[product]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Quantidade atual
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            {quantity}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--text-h)]">
            Quantidade da movimentação
          </label>
          <Input
            className="mt-1.5 max-w-[160px]"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            Entrada
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleRemove}>
            <Minus className="h-3.5 w-3.5" />
            Saída
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EstoquePage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
          Estoque
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Controle interno simplificado de quantidade disponível por produto.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {STOCK_PRODUCT_ORDER.map((product) => (
          <StockRow key={product} product={product} />
        ))}
      </div>
    </div>
  )
}
