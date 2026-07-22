import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_ADMIN,
  isAdminUser,
  normalizeAppUser,
  SEED_USERS,
} from '@/constants/users'
import {
  fetchUsersFromServer,
  syncUsersToServer,
} from '@/services/usersApi'
import type { AppUser, WorkflowStageId } from '@/types/workflow'

function mergeUsers(localUsers: AppUser[], remoteUsers: AppUser[]): AppUser[] {
  const byLogin = new Map<string, AppUser>()

  for (const user of [...remoteUsers, ...localUsers]) {
    const key = user.login.trim().toLowerCase()
    const existing = byLogin.get(key)
    if (!existing) {
      byLogin.set(key, normalizeAppUser(user))
      continue
    }

    // Prefer the newest operator data; always keep admin master.
    if (isAdminUser(user) || isAdminUser(existing)) {
      byLogin.set(key, normalizeAppUser({ ...existing, ...user, role: 'admin' }))
      continue
    }

    const existingTime = new Date(existing.createdAt).getTime()
    const nextTime = new Date(user.createdAt).getTime()
    byLogin.set(
      key,
      normalizeAppUser(nextTime >= existingTime ? { ...existing, ...user } : existing)
    )
  }

  const merged = [...byLogin.values()]
  const hasAdmin = merged.some((u) => isAdminUser(u))
  return hasAdmin ? merged : [DEFAULT_ADMIN, ...merged]
}

type AuthState = {
  users: AppUser[]
  currentUser: AppUser | null
  hydrated: boolean

  login: (login: string, password: string) => { ok: boolean; error?: string }
  logout: () => void

  createUser: (input: {
    login: string
    password: string
    name: string
    assignedStages: WorkflowStageId[]
  }) => { ok: boolean; error?: string }

  updateUserStages: (
    userId: string,
    assignedStages: WorkflowStageId[]
  ) => { ok: boolean; error?: string }

  toggleUserActive: (userId: string) => void

  syncUsersFromServer: () => Promise<{ ok: boolean; error?: string }>
  getOperators: () => AppUser[]
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUser: null,
      hydrated: false,

      login: (login, password) => {
        if (!get().hydrated) {
          return {
            ok: false,
            error: 'Aguarde carregar a sessão e tente novamente.',
          }
        }

        const normalized = login.trim().toLowerCase()
        const pass = password.trim()

        const user = get().users.find(
          (u) =>
            u.login.toLowerCase() === normalized && u.password.trim() === pass
        )

        if (!user) {
          return {
            ok: false,
            error:
              'Login ou senha inválidos. Use o login em minúsculas (ex.: joao) e a senha criada pelo admin.',
          }
        }
        if (!user.active) {
          return {
            ok: false,
            error: 'Usuário desativado. Contate o administrador.',
          }
        }

        set({ currentUser: normalizeAppUser(user) })
        return { ok: true }
      },

      logout: () => {
        set({ currentUser: null })
      },

      createUser: ({ login, password, name, assignedStages }) => {
        const current = get().currentUser
        if (!current || !isAdminUser(current)) {
          return {
            ok: false,
            error: 'Apenas o administrador pode criar usuários.',
          }
        }

        const normalized = login.trim().toLowerCase()
        const pass = password.trim()
        if (!normalized || !pass || !name.trim()) {
          return { ok: false, error: 'Preencha todos os campos.' }
        }
        if (pass.length < 4) {
          return { ok: false, error: 'Senha com no mínimo 4 caracteres.' }
        }
        if (assignedStages.length === 0) {
          return {
            ok: false,
            error: 'Atribua ao menos uma etapa ao operador.',
          }
        }
        if (get().users.some((u) => u.login.toLowerCase() === normalized)) {
          return { ok: false, error: 'Já existe um usuário com este login.' }
        }

        const newUser: AppUser = {
          id: crypto.randomUUID(),
          login: normalized,
          password: pass,
          name: name.trim(),
          role: 'operator',
          assignedStages: [...assignedStages].sort((a, b) => a - b),
          active: true,
          createdAt: new Date().toISOString(),
        }

        const users = [...get().users, newUser]
        set({ users })
        void syncUsersToServer(users)
        return { ok: true }
      },

      updateUserStages: (userId, assignedStages) => {
        const current = get().currentUser
        if (!current || !isAdminUser(current)) {
          return { ok: false, error: 'Sem permissão.' }
        }
        if (assignedStages.length === 0) {
          return { ok: false, error: 'Atribua ao menos uma etapa.' }
        }

        const users = get().users.map((u) =>
          u.id === userId && u.role !== 'admin'
            ? {
                ...u,
                assignedStages: [...assignedStages].sort((a, b) => a - b),
              }
            : u
        )
        set({ users })
        void syncUsersToServer(users)
        return { ok: true }
      },

      toggleUserActive: (userId) => {
        const current = get().currentUser
        if (!current || !isAdminUser(current)) return
        if (userId === DEFAULT_ADMIN.id) return

        const users = get().users.map((u) =>
          u.id === userId ? { ...u, active: !u.active } : u
        )
        set({ users })
        void syncUsersToServer(users)
      },

      syncUsersFromServer: async () => {
        const localUsers = get().users.map(normalizeAppUser)

        const syncResult = await syncUsersToServer(localUsers)
        if (syncResult.ok) {
          const merged = mergeUsers(localUsers, syncResult.users)
          set({ users: merged })
          return { ok: true }
        }

        const fetchResult = await fetchUsersFromServer()
        if (fetchResult.ok) {
          const merged = mergeUsers(localUsers, fetchResult.users)
          set({ users: merged })
          void syncUsersToServer(merged)
          return { ok: true }
        }

        return {
          ok: false,
          error: fetchResult.ok === false ? fetchResult.error : syncResult.error,
        }
      },

      getOperators: () => get().users.filter((u) => u.role === 'operator'),
    }),
    {
      name: 'auth-workflow-v1',
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.users = mergeUsers(
            state.users.map(normalizeAppUser),
            [DEFAULT_ADMIN]
          )

          if (state.currentUser) {
            const freshUser = state.users.find(
              (u) =>
                u.id === state.currentUser!.id ||
                u.login === state.currentUser!.login
            )
            state.currentUser = freshUser
              ? normalizeAppUser(freshUser)
              : null
          }

          state.hydrated = true
        } else {
          queueMicrotask(() => {
            useAuthStore.setState({ hydrated: true })
          })
        }
      },
    }
  )
)

// Garante hydrated mesmo se a rehidratação falhar / demorar.
if (typeof window !== 'undefined') {
  const finish = () => {
    if (!useAuthStore.getState().hydrated) {
      useAuthStore.setState({ hydrated: true })
    }
    void useAuthStore.getState().syncUsersFromServer()
  }

  if (useAuthStore.persist.hasHydrated()) {
    finish()
  } else {
    useAuthStore.persist.onFinishHydration(finish)
  }
}
