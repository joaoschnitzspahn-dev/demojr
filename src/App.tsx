import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import CadastroPedidoPage from './pages/CadastroPedidoPage'
import LoginPage from './pages/LoginPage'
import UsuariosAdminPage from './pages/UsuariosAdminPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { useAuthStore } from './store/authStore'

function AppRoutes() {
  const currentUser = useAuthStore((s) => s.currentUser)

  return (
    <Routes>
      <Route
        path="/login"
        element={
          currentUser ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cadastro"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CadastroPedidoPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout>
              <UsuariosAdminPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={currentUser ? '/' : '/login'} replace />}
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
