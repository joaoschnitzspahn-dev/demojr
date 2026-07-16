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

const schema = z.object({
  client: z.string().min(2, 'Informe o nome do cliente.'),
  description: z.string().min(2, 'Informe a descrição do pedido.'),
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
    defaultValues: { client: '', description: '', observations: '' },
  })

  function onSubmit(values: FormValues) {
    createOrder({
      client: values.client,
      description: values.description,
      observations: values.observations ?? '',
    })
    toast.success(
      'Pedido criado',
      `Recebimento iniciado por ${currentUser?.name ?? 'usuário'}.`
    )
    navigate('/')
  }

  return (
    <div className="max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
          Novo pedido
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Ao salvar, o pedido entra automaticamente na etapa Recebimento.
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
                Cliente
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

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Descrição
              </label>
              <Textarea
                className="mt-1.5"
                placeholder="Descreva o pedido..."
                {...register('description')}
              />
              {errors.description ? (
                <p className="mt-1.5 text-xs text-[var(--danger)]">
                  {errors.description.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-h)]">
                Observações
              </label>
              <Textarea
                className="mt-1.5"
                placeholder="Opcional"
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
