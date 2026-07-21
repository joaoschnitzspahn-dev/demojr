import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { isAdminUser } from '@/constants/users'
import type { UserRole } from '@/types/workflow'

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode
  roles?: UserRole[]
}) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const hydrated = useAuthStore((s) => s.hydrated)
  const location = useLocation()

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]">
        Carregando sessão...
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles?.includes('admin')) {
    if (!isAdminUser(currentUser)) {
      return <Navigate to="/" replace />
    }
  } else if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
