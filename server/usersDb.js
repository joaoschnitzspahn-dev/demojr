import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hasDatabaseUrl, query } from './pg.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const USERS_DB_PATH =
  process.env.USERS_DATABASE_PATH ||
  path.join(__dirname, '..', 'data', 'users.json')

const DEFAULT_ADMIN = {
  id: 'user-admin-master',
  login: 'adm',
  password: 'adm123',
  name: 'Administrador Master',
  role: 'admin',
  assignedStages: [1, 2, 3, 4, 5, 6, 7],
  active: true,
  createdAt: new Date(0).toISOString(),
}

const DEFAULT_OPERATOR = {
  id: 'user-operator-infra',
  login: 'infra',
  password: 'infra123',
  name: 'Infra',
  role: 'operator',
  assignedStages: [1, 2, 3, 4, 5, 6, 7],
  active: true,
  createdAt: new Date(0).toISOString(),
}

const TEAM_OPERATORS = [
  {
    id: 'user-operator-kemellyn',
    login: 'kemellyn',
    password: '123',
    name: 'Kemellyn',
    role: 'operator',
    assignedStages: [1, 5],
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
    login: 'expedicao',
    password: '123',
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
    assignedStages: [7],
    active: true,
    createdAt: new Date(0).toISOString(),
  },
]

const SEED_USERS = [DEFAULT_ADMIN, DEFAULT_OPERATOR, ...TEAM_OPERATORS]

function ensureUsersDb() {
  const dir = path.dirname(USERS_DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(USERS_DB_PATH)) {
    fs.writeFileSync(
      USERS_DB_PATH,
      JSON.stringify({ users: SEED_USERS }, null, 2),
      'utf8'
    )
  }
}

function readUsersDb() {
  ensureUsersDb()
  const raw = fs.readFileSync(USERS_DB_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.users)) {
    return { users: [DEFAULT_ADMIN] }
  }
  return parsed
}

function writeUsersDb(data) {
  ensureUsersDb()
  fs.writeFileSync(USERS_DB_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function ensureSeedUsers(users) {
  let next = [...users]

  const hasAdmin = next.some(
    (u) => u.role === 'admin' || String(u.login).toLowerCase() === 'adm'
  )
  if (!hasAdmin) next = [DEFAULT_ADMIN, ...next]

  next = next.map((u) =>
    String(u.login).toLowerCase() === 'adm'
      ? { ...DEFAULT_ADMIN, ...u, role: 'admin', login: 'adm' }
      : u
  )

  const hasInfra = next.some((u) => String(u.login).toLowerCase() === 'infra')
  if (!hasInfra) {
    next = [...next, DEFAULT_OPERATOR]
  } else {
    next = next.map((u) =>
      String(u.login).toLowerCase() === 'infra'
        ? {
            ...DEFAULT_OPERATOR,
            ...u,
            login: 'infra',
            password: u.password || DEFAULT_OPERATOR.password,
            role: 'operator',
            assignedStages: [1, 2, 3, 4, 5, 6, 7],
            active: u.active !== false,
          }
        : u
    )
  }

  for (const teamUser of TEAM_OPERATORS) {
    const login = teamUser.login.toLowerCase()
    const existing = next.find(
      (u) =>
        String(u.id) === teamUser.id ||
        String(u.login).toLowerCase() === login
    )
    if (!existing) {
      next = [...next, teamUser]
    } else {
      next = next.map((u) =>
        String(u.id) === existing.id
          ? {
              ...teamUser,
              ...u,
              id: u.id || teamUser.id,
              login: String(u.login || teamUser.login)
                .trim()
                .toLowerCase(),
              password: u.password || teamUser.password,
              name: u.name || teamUser.name,
              role: 'operator',
              assignedStages:
                Array.isArray(u.assignedStages) && u.assignedStages.length > 0
                  ? u.assignedStages
                  : [...teamUser.assignedStages],
              active: u.active !== false,
            }
          : u
      )
    }
  }

  return next
}

function rowToUser(row) {
  return {
    id: row.id,
    login: row.login,
    password: row.password,
    name: row.name,
    role: row.role,
    assignedStages: row.assigned_stages,
    active: row.active,
    createdAt: row.created_at,
    ...(row.data && typeof row.data === 'object' ? row.data : {}),
  }
}

export async function listUsers() {
  if (hasDatabaseUrl()) {
    const result = await query(
      `SELECT id, login, password, name, role, assigned_stages, active, created_at, data
       FROM users
       ORDER BY created_at ASC`
    )
    return ensureSeedUsers(result.rows.map(rowToUser))
  }

  return ensureSeedUsers(readUsersDb().users)
}

export async function syncUsers(users) {
  if (!Array.isArray(users)) {
    throw new Error('Lista de usuários inválida.')
  }

  const cleaned = ensureSeedUsers(
    users
      .filter((u) => u && u.id && u.login && u.password)
      .map((u) => ({
        id: String(u.id),
        login: String(u.login).trim().toLowerCase(),
        password: String(u.password),
        name: String(u.name || u.login).trim(),
        role: u.role === 'admin' ? 'admin' : 'operator',
        assignedStages: Array.isArray(u.assignedStages)
          ? u.assignedStages
          : [],
        active: u.active !== false,
        createdAt: u.createdAt || new Date().toISOString(),
      }))
  )

  if (hasDatabaseUrl()) {
    const client = (await import('./pg.js')).getPool()
    const conn = await client.connect()
    try {
      await conn.query('BEGIN')
      await conn.query('DELETE FROM users')
      for (const u of cleaned) {
        await conn.query(
          `
          INSERT INTO users
            (id, login, password, name, role, assigned_stages, active, created_at, updated_at, data)
          VALUES
            ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), '{}'::jsonb)
        `,
          [
            u.id,
            u.login,
            u.password,
            u.name,
            u.role,
            JSON.stringify(u.assignedStages),
            u.active,
            u.createdAt,
          ]
        )
      }
      await conn.query('COMMIT')
    } catch (e) {
      await conn.query('ROLLBACK')
      throw e
    } finally {
      conn.release()
    }
    return cleaned
  }

  writeUsersDb({ users: cleaned })
  return cleaned
}

export function getUsersDbPath() {
  if (hasDatabaseUrl()) return 'postgresql (users)'
  ensureUsersDb()
  return USERS_DB_PATH
}
