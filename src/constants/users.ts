import type { AppUser, WorkflowStageId } from '@/types/workflow'

export const ADMIN_LOGIN = 'adm'
export const ADMIN_PASSWORD = 'adm123'

export const OPERATOR_LOGIN = 'infra'
export const OPERATOR_PASSWORD = 'infra123'

export const EXPEDICAO_LOGIN = 'expedicao'
export const EXPEDICAO_PASSWORD = '123'

const ALL_STAGES: WorkflowStageId[] = [1, 2, 3, 4, 5, 6, 7]

export const DEFAULT_ADMIN: AppUser = {
  id: 'user-admin-master',
  login: ADMIN_LOGIN,
  password: ADMIN_PASSWORD,
  name: 'Administrador Master',
  role: 'admin',
  assignedStages: ALL_STAGES,
  active: true,
  createdAt: new Date(0).toISOString(),
}

/** Operador padrão com acesso a todos os processos. */
export const DEFAULT_OPERATOR: AppUser = {
  id: 'user-operator-infra',
  login: OPERATOR_LOGIN,
  password: OPERATOR_PASSWORD,
  name: 'Infra',
  role: 'operator',
  assignedStages: ALL_STAGES,
  active: true,
  createdAt: new Date(0).toISOString(),
}

/**
 * Operadores da equipe (login minúsculo, senha 123).
 * Observação: o workflow atual possui processos 1–7.
 * Rodrigo foi pedido para o processo 8 (ainda inexistente) — conta criada sem etapa.
 */
export const TEAM_OPERATORS: AppUser[] = [
  {
    id: 'user-operator-kemellyn',
    login: 'kemellyn',
    password: '123',
    name: 'Kemellyn',
    role: 'operator',
    assignedStages: [1, 5, 7],
    active: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'user-operator-josi',
    login: 'josi',
    password: '123',
    name: 'Josi',
    role: 'operator',
    assignedStages: [2],
    active: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'user-operator-expedicao',
    login: EXPEDICAO_LOGIN,
    password: EXPEDICAO_PASSWORD,
    name: 'Expedição',
    role: 'operator',
    assignedStages: [3],
    active: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'user-operator-sara',
    login: 'sara',
    password: '123',
    name: 'Sara',
    role: 'operator',
    assignedStages: [4, 6],
    active: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'user-operator-rodrigo',
    login: 'rodrigo',
    password: '123',
    name: 'Rodrigo',
    role: 'operator',
    // Processo 8 ainda não existe no sistema — sem atribuição até definição.
    assignedStages: [],
    active: true,
    createdAt: new Date(0).toISOString(),
  },
]

/** @deprecated use TEAM_OPERATORS find expedicao */
export const DEFAULT_EXPEDICAO =
  TEAM_OPERATORS.find((u) => u.login === EXPEDICAO_LOGIN)!

const TEAM_BY_LOGIN = new Map(
  TEAM_OPERATORS.map((u) => [u.login.toLowerCase(), u])
)

/** Seed inicial: admin + infra + equipe. */
export const SEED_USERS: AppUser[] = [
  DEFAULT_ADMIN,
  DEFAULT_OPERATOR,
  ...TEAM_OPERATORS,
]

/** Nome padrão para seeds/mocks. */
export const OPERADOR_FICTICIO = DEFAULT_ADMIN.name

export function isAdminUser(user: AppUser | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.login.toLowerCase() === ADMIN_LOGIN.toLowerCase()
}

export function normalizeAppUser(user: AppUser): AppUser {
  const validStages = ALL_STAGES
  let assignedStages = (user.assignedStages ?? []).filter((s) =>
    validStages.includes(s)
  )

  // Migração: quem tinha as 6 etapas antigas recebe a nova etapa 2 (NF) e 7 (Renovação).
  if (
    assignedStages.includes(1) &&
    assignedStages.includes(2) &&
    assignedStages.includes(3) &&
    assignedStages.includes(4) &&
    assignedStages.includes(5) &&
    assignedStages.includes(6) &&
    !assignedStages.includes(7)
  ) {
    assignedStages = [...ALL_STAGES]
  }

  if (user.login.toLowerCase() === ADMIN_LOGIN.toLowerCase()) {
    return {
      ...DEFAULT_ADMIN,
      ...user,
      role: 'admin',
      assignedStages: ALL_STAGES,
      active: user.active ?? true,
    }
  }

  if (user.login.toLowerCase() === OPERATOR_LOGIN.toLowerCase()) {
    return {
      ...DEFAULT_OPERATOR,
      ...user,
      id: user.id || DEFAULT_OPERATOR.id,
      login: OPERATOR_LOGIN,
      password: user.password || OPERATOR_PASSWORD,
      name: user.name?.trim() || DEFAULT_OPERATOR.name,
      role: 'operator',
      assignedStages: ALL_STAGES,
      active: user.active ?? true,
    }
  }

  const teamSeed = TEAM_BY_LOGIN.get(user.login.toLowerCase())
  if (teamSeed) {
    return {
      ...teamSeed,
      ...user,
      id: user.id || teamSeed.id,
      login: teamSeed.login,
      password: user.password || teamSeed.password,
      name: user.name?.trim() || teamSeed.name,
      role: 'operator',
      assignedStages: [...teamSeed.assignedStages],
      active: user.active ?? true,
    }
  }

  return {
    ...user,
    assignedStages,
    role: user.role === 'admin' ? 'admin' : 'operator',
  }
}

export function canUserWorkOnStage(
  user: AppUser | null | undefined,
  stageId: WorkflowStageId
): boolean {
  if (!user || !user.active) return false
  if (isAdminUser(user)) return true
  return user.assignedStages.includes(stageId)
}
