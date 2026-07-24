import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrdersStore } from '@/store/ordersStore'
import { toast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/authStore'
import { PRODUCT_OPTIONS } from '@/constants/products'
import type { ProductType } from '@/types/workflow'

type FormState = {
  client: string
  cpf: string
  email: string
  phone: string
  product: ProductType
  deviceQuantity: string
  prontosoftOrderNumber: string
  observations: string
}

export default function CadastroPedidoPage() {
  const navigate = useNavigate()
  const createOrder = useOrdersStore((s) => s.createOrder)
  const currentUser = useAuthStore((s) => s.currentUser)

  const [form, setForm] = React.useState<FormState>({
    client: '',
    cpf: '',
    email: '',
    phone: '',
    product: 'mini_rastreador',
    deviceQuantity: '1',
    prontosoftOrderNumber: '',
    observations: '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const clientRef = React.useRef<HTMLInputElement>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  function validate(): string | null {
    if (form.client.trim().length < 2) {
      return 'Informe o nome do cliente.'
    }
    if (form.cpf.replace(/\D/g, '').length < 11) {
      return 'CPF deve ter pelo menos 11 dígitos.'
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      return 'Informe um e-mail válido.'
    }
    if (form.phone.trim().length < 8) {
      return 'Informe o telefone.'
    }
    const qty = Number(form.deviceQuantity)
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1) {
      return 'Informe a quantidade de aparelhos (número inteiro ≥ 1).'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      toast.error('Não foi possível salvar', validationError)
      if (validationError.includes('nome')) {
        clientRef.current?.focus()
        clientRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
      return
    }

    if (!currentUser) {
      const msg = 'Sessão expirada. Faça login novamente.'
      setError(msg)
      toast.error('Sessão expirada', msg)
      navigate('/login')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const result = await createOrder({
        client: form.client.trim(),
        cpf: form.cpf.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        product: form.product,
        observations: form.observations.trim(),
        deviceQuantity: Math.max(
          1,
          Math.floor(Number(form.deviceQuantity) || 1)
        ),
        prontosoftOrderNumber: form.prontosoftOrderNumber.trim(),
      })

      if (!result.ok) {
        toast.error(
          'Pedido criado com aviso',
          result.error ?? 'Não gravou no servidor.'
        )
      } else {
        toast.success('Pedido criado', `Salvo no banco · ${currentUser.name}`)
      }
      navigate('/')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erro inesperado ao criar pedido.'
      setError(msg)
      toast.error('Erro ao criar pedido', msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
          Novo pedido
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          O número do pedido é gerado automaticamente. Ao salvar, o fluxo inicia
          em Cadastro do Pedido.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados do pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Nome do cliente <span className="text-[var(--danger)]">*</span>
              </label>
              <Input
                ref={clientRef}
                className="mt-1.5"
                placeholder="Ex.: Mariana Souza"
                value={form.client}
                onChange={(e) => update('client', e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  CPF <span className="text-[var(--danger)]">*</span>
                </label>
                <Input
                  className="mt-1.5"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => update('cpf', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  Telefone <span className="text-[var(--danger)]">*</span>
                </label>
                <Input
                  className="mt-1.5"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                E-mail <span className="text-[var(--danger)]">*</span>
              </label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="cliente@email.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Nº pedido Prontosoft
              </label>
              <Input
                className="mt-1.5"
                placeholder="PS-2026-00000"
                autoComplete="off"
                value={form.prontosoftOrderNumber}
                onChange={(e) => update('prontosoftOrderNumber', e.target.value)}
              />
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                Opcional agora · obrigatório antes de concluir Cadastro
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Quantidade de aparelhos{' '}
                <span className="text-[var(--danger)]">*</span>
              </label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                step={1}
                value={form.deviceQuantity}
                onChange={(e) => update('deviceQuantity', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Produto <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                className="mt-1.5 flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                value={form.product}
                onChange={(e) =>
                  update('product', e.target.value as ProductType)
                }
              >
                {PRODUCT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                Mini Rastreador inclui automaticamente o processo de Renovação.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Observações
              </label>
              <Textarea
                className="mt-1.5"
                placeholder="Observações do pedido"
                value={form.observations}
                onChange={(e) => update('observations', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={saving}>
                {saving ? 'Criando...' : 'Salvar pedido'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
