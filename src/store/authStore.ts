import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_ADMIN, isAdminUser, normalizeAppUser, SEED_USERS } from '@/constants/users'
import type { AppUser, WorkflowStageId } from '@/types/workflow'

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

  getOperators: () => AppUser[]
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,
      currentUser: null,
      hydrated: false,

      login: (login, password) => {
        const normalized = login.trim().toLowerCase()
        const user = get().users.find(
          (u) => u.login.toLowerCase() === normalized && u.password === password
        )

        if (!user) {
          return { ok: false, error: 'Login ou senha inválidos.' }
        }
        if (!user.active) {
          return { ok: false, error: 'Usuário desativado. Contate o administrador.' }
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
          return { ok: false, error: 'Apenas o administrador pode criar usuários.' }
        }

        const normalized = login.trim().toLowerCase()
        if (!normalized || !password || !name.trim()) {
          return { ok: false, error: 'Preencha todos os campos.' }
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
          password,
          name: name.trim(),
          role: 'operator',
          assignedStages: [...assignedStages].sort((a, b) => a - b),
          active: true,
          createdAt: new Date().toISOString(),
        }

        set((s) => ({ users: [...s.users, newUser] }))
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

        set((s) => ({
          users: s.users.map((u) =>
            u.id === userId && u.role !== 'admin'
              ? {
                  ...u,
                  assignedStages: [...assignedStages].sort((a, b) => a - b),
                }
              : u
          ),
        }))
        return { ok: true }
      },

      toggleUserActive: (userId) => {
        const current = get().currentUser
        if (!current || !isAdminUser(current)) return
        if (userId === DEFAULT_ADMIN.id) return

        set((s) => ({
          users: s.users.map((u) =>
            u.id === userId ? { ...u, active: !u.active } : u
          ),
        }))
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
          state.users = state.users.map(normalizeAppUser)

          const hasAdmin = state.users.some(
            (u) => isAdminUser(u) && u.login === DEFAULT_ADMIN.login
          )
          if (!hasAdmin) {
            state.users = [DEFAULT_ADMIN, ...state.users]
          }

          if (state.currentUser) {
            const freshUser = state.users.find(
              (u) => u.id === state.currentUser!.id
            )
            state.currentUser = normalizeAppUser(freshUser ?? state.currentUser)
          }

          state.hydrated = true
        }
      },
    }
  )
)
