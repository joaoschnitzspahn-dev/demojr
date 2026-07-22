import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/components/ui/toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const currentUser = useAuthStore((s) => s.currentUser)
  const hydrated = useAuthStore((s) => s.hydrated)
  const syncUsersFromServer = useAuthStore((s) => s.syncUsersFromServer)

  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hydrated) {
      void syncUsersFromServer()
    }
  }, [hydrated, syncUsersFromServer])

  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!hydrated) {
      setLoading(false)
      setError('Carregando sessão... tente novamente em 1 segundo.')
      return
    }

    await syncUsersFromServer()

    window.setTimeout(() => {
      const result = login(loginValue, password)
      setLoading(false)

      if (!result.ok) {
        setError(result.error ?? 'Falha no login.')
        return
      }

      toast.success('Sessão iniciada')
      navigate('/', { replace: true })
    }, 150)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
            SI
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-h)]">
            Entrar no Sistema Infra
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Workflow operacional da equipe
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  Login
                </label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    className="pl-9"
                    value={loginValue}
                    onChange={(e) => setLoginValue(e.target.value)}
                    placeholder="Seu login"
                    autoComplete="username"
                    autoFocus
                    disabled={!hydrated || loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-h)]">
                  Senha
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    className="pl-9"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={!hydrated || loading}
                  />
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger)]">
                  {error}
                </p>
              ) : null}

              {!hydrated ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Carregando usuários...
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !hydrated || !loginValue || !password}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
