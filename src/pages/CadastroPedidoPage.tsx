import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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

const schema = z.object({
  client: z.string().min(2, 'Informe o nome do cliente.'),
  cpf: z.string().min(11, 'Informe o CPF.'),
  email: z.string().email('Informe um e-mail válido.'),
  phone: z.string().min(8, 'Informe o telefone.'),
  product: z.enum(['mini_rastreador', 'lv12_4g'], {
    message: 'Selecione o produto.',
  }),
  deviceQuantity: z
    .number({ error: 'Informe a quantidade de aparelhos.' })
    .int('Informe um número inteiro.')
    .min(1, 'Informe a quantidade de aparelhos.'),
  prontosoftOrderNumber: z.string().optional(),
  observations: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CadastroPedidoPage() {
  const navigate = useNavigate()
  const createOrder = useOrdersStore((s) => s.createOrder)
  const currentUser = useAuthStore((s) => s.currentUser)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: '',
      cpf: '',
      email: '',
      phone: '',
      product: 'mini_rastreador',
      deviceQuantity: 1,
      prontosoftOrderNumber: '',
      observations: '',
    },
  })

  async function onSubmit(values: FormValues) {
    const result = await createOrder({
      client: values.client,
      cpf: values.cpf,
      email: values.email,
      phone: values.phone,
      product: values.product as ProductType,
      observations: values.observations ?? '',
      deviceQuantity: values.deviceQuantity,
      prontosoftOrderNumber: values.prontosoftOrderNumber ?? '',
    })

    if (!result.ok) {
      toast.error(
        'Pedido criado com aviso',
        result.error ?? 'Não gravou no servidor. Verifique a conexão.'
      )
    } else {
      toast.success(
        'Pedido criado',
        `Salvo no banco · iniciado por ${currentUser?.name ?? 'usuário'}.`
      )
    }
    navigate('/')
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Nome do cliente
              </label>
              <Input
                className="mt-1.5"
                placeholder="Ex.: Mariana Souza"
                {...register('client')}
              />
              {errors.client ? (
                <p className="mt-1.5 text-xs text-[var(--danger)]">
                  {errors.client.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  CPF
                </label>
                <Input
                  className="mt-1.5"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                />
                {errors.cpf ? (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">
                    {errors.cpf.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  Telefone
                </label>
                <Input
                  className="mt-1.5"
                  placeholder="(00) 00000-0000"
                  {...register('phone')}
                />
                {errors.phone ? (
                  <p className="mt-1.5 text-xs text-[var(--danger)]">
                    {errors.phone.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                E-mail
              </label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="cliente@email.com"
                {...register('email')}
              />
              {errors.email ? (
                <p className="mt-1.5 text-xs text-[var(--danger)]">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Nº pedido Prontosoft
              </label>
              <Input
                className="mt-1.5"
                placeholder="PS-2026-00000"
                autoComplete="off"
                {...register('prontosoftOrderNumber')}
              />
              {errors.prontosoftOrderNumber ? (
                <p className="mt-1.5 text-xs text-[var(--danger)]">
                  {errors.prontosoftOrderNumber.message}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                  Opcional agora · obrigatório antes de concluir Cadastro
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Quantidade de aparelhos
              </label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                step={1}
                {...register('deviceQuantity', { valueAsNumber: true })}
              />
              {errors.deviceQuantity ? (
                <p className="mt-1.5 text-xs text-[var(--danger)]">
                  {errors.deviceQuantity.message}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                  Obrigatório · visível em todo o fluxo do pedido
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Produto
              </label>
              <select
                className="mt-1.5 flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-h)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                {...register('product')}
              >
                {PRODUCT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.product ? (
                <p className="mt-1.5 text-xs text-[var(--danger)]">
                  {errors.product.message}
                </p>
              ) : null}
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
                {...register('observations')}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Salvar pedido'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
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
