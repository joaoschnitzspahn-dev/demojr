import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Archive, LayoutGrid, LogOut, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { Toaster } from '@/components/ui/toast'
import OrderDrawer from '@/components/orders/OrderDrawer'
import { useAuthStore } from '@/store/authStore'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = currentUser?.role === 'admin'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Toaster />
      <OrderDrawer />

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-elevated)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-semibold text-white">
                SI
              </div>
              <div className="leading-none">
                <div className="text-sm font-semibold text-[var(--text-h)]">
                  Sistema Infra
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-0.5 sm:flex">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    location.pathname === '/' &&
                      'bg-[var(--bg-muted)] text-[var(--text-h)]'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Pedidos
                </Button>
              </Link>
              <Link to="/finalizados">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    location.pathname === '/finalizados' &&
                      'bg-[var(--bg-muted)] text-[var(--text-h)]'
                  )}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Finalizados
                </Button>
              </Link>
              {isAdmin ? (
                <Link to="/usuarios">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      location.pathname === '/usuarios' &&
                        'bg-[var(--bg-muted)] text-[var(--text-h)]'
                    )}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Usuários
                  </Button>
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-1 hidden items-center gap-2 sm:flex">
              <span className="text-xs text-[var(--text-muted)]">
                {currentUser?.name}
              </span>
              {isAdmin ? (
                <span className="rounded-md bg-[var(--accent-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                  Admin
                </span>
              ) : null}
            </div>

            <Link to="/cadastro">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Novo pedido
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-[var(--text-muted)]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-8">{children}</main>
    </div>
  )
}
