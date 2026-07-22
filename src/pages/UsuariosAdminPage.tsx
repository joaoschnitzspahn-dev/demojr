import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { WORKFLOW_STAGE_ORDER, WORKFLOW_STAGES, getStageTitle } from '@/constants/workflowStages'
import type { WorkflowStageId } from '@/types/workflow'
import { toast } from '@/components/ui/toast'
import { formatDate } from '@/utils/date'
import { cn } from '@/utils/cn'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  login: z.string().min(2, 'Informe o login.'),
  password: z.string().min(4, 'Senha com no mínimo 4 caracteres.'),
})

type FormValues = z.infer<typeof schema>

function stageLabel(stageId: WorkflowStageId) {
  try {
    return getStageTitle(stageId)
  } catch {
    return `Etapa ${stageId}`
  }
}

export default function UsuariosAdminPage() {
  const users = useAuthStore((s) => s.users)
  const createUser = useAuthStore((s) => s.createUser)
  const updateUserStages = useAuthStore((s) => s.updateUserStages)
  const toggleUserActive = useAuthStore((s) => s.toggleUserActive)

  const [showForm, setShowForm] = useState(false)
  const [assignedStages, setAssignedStages] = useState<WorkflowStageId[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStages, setEditStages] = useState<WorkflowStageId[]>([])

  const operators = useMemo(
    () => users.filter((u) => u.role === 'operator'),
    [users]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', login: '', password: '' },
  })

  function toggleStage(
    list: WorkflowStageId[],
    stageId: WorkflowStageId,
    setter: (v: WorkflowStageId[]) => void
  ) {
    if (list.includes(stageId)) {
      setter(list.filter((s) => s !== stageId))
    } else {
      setter([...list, stageId])
    }
  }

  function onSubmit(values: FormValues) {
    const result = createUser({
      ...values,
      assignedStages,
    })

    if (!result.ok) {
      toast.error('Não foi possível criar', result.error)
      return
    }

    toast.success(
      'Usuário criado',
      `Login: ${values.login.trim().toLowerCase()} · Senha: a que você definiu`
    )
    reset()
    setAssignedStages([])
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            Usuários & atribuições
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-muted)]">
            Crie operadores e defina em quais processos cada um pode atuar.
          </p>
        </div>

        <Button onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-3.5 w-3.5" />
          {showForm ? 'Fechar' : 'Criar usuário'}
        </Button>
      </div>

      {showForm ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Novo operador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-h)]">
                    Nome
                  </label>
                  <Input
                    className="mt-1.5"
                    placeholder="João Silva"
                    {...register('name')}
                  />
                  {errors.name ? (
                    <p className="mt-1 text-xs text-[var(--danger)]">
                      {errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-h)]">
                    Login
                  </label>
                  <Input
                    className="mt-1.5"
                    placeholder="joao"
                    {...register('login')}
                  />
                  {errors.login ? (
                    <p className="mt-1 text-xs text-[var(--danger)]">
                      {errors.login.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-h)]">
                    Senha
                  </label>
                  <Input
                    className="mt-1.5"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  {errors.password ? (
                    <p className="mt-1 text-xs text-[var(--danger)]">
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  Etapas que pode executar
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {WORKFLOW_STAGE_ORDER.map((stageId) => {
                    const selected = assignedStages.includes(stageId)
                    return (
                      <button
                        key={stageId}
                        type="button"
                        onClick={() =>
                          toggleStage(assignedStages, stageId, setAssignedStages)
                        }
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                          selected
                            ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:bg-[var(--bg-muted)]'
                        )}
                      >
                        <div className="font-medium">
                          {stageId}. {stageLabel(stageId)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || assignedStages.length === 0}
              >
                <Plus className="h-3.5 w-3.5" />
                Salvar usuário
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-medium text-[var(--text-h)]">
          Operadores ({operators.length})
        </h2>

        {operators.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[var(--text-muted)]">
              Nenhum operador criado ainda.
            </CardContent>
          </Card>
        ) : (
          operators.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-h)]">
                        {user.name}
                      </span>
                      <Badge variant={user.active ? 'success' : 'locked'}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Login: {user.login} · Criado em {formatDate(user.createdAt)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {user.assignedStages
                        .filter((sid) => WORKFLOW_STAGES[sid])
                        .map((sid) => (
                        <Badge key={sid} variant="accent">
                          {sid}. {stageLabel(sid)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editingId === user.id) {
                          setEditingId(null)
                          return
                        }
                        setEditingId(user.id)
                        setEditStages([...user.assignedStages])
                      }}
                    >
                      {editingId === user.id ? 'Cancelar' : 'Editar etapas'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        toggleUserActive(user.id)
                        toast.info(
                          user.active ? 'Usuário desativado' : 'Usuário ativado'
                        )
                      }}
                    >
                      {user.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>

                {editingId === user.id ? (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {WORKFLOW_STAGE_ORDER.map((stageId) => {
                        const selected = editStages.includes(stageId)
                        return (
                          <button
                            key={stageId}
                            type="button"
                            onClick={() =>
                              toggleStage(editStages, stageId, setEditStages)
                            }
                            className={cn(
                              'rounded-lg border px-3 py-2 text-left text-xs',
                              selected
                                ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] text-[var(--accent)]'
                                : 'border-[var(--border)] text-[var(--text)]'
                            )}
                          >
                            {stageId}. {stageLabel(stageId)}
                          </button>
                        )
                      })}
                    </div>
                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={() => {
                        const result = updateUserStages(user.id, editStages)
                        if (!result.ok) {
                          toast.error('Erro', result.error)
                          return
                        }
                        toast.success('Etapas atualizadas')
                        setEditingId(null)
                      }}
                    >
                      Salvar atribuições
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
