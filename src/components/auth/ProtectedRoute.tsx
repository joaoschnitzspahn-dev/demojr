import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types/workflow'

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode
  roles?: UserRole[]
}) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
