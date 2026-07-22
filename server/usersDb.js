import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
  assignedStages: [1, 2, 3, 4, 5, 6],
  active: true,
  createdAt: new Date(0).toISOString(),
}

const DEFAULT_OPERATOR = {
  id: 'user-operator-infra',
  login: 'infra',
  password: 'infra123',
  name: 'Infra',
  role: 'operator',
  assignedStages: [1, 2, 3, 4, 5, 6],
  active: true,
  createdAt: new Date(0).toISOString(),
}

const SEED_USERS = [DEFAULT_ADMIN, DEFAULT_OPERATOR]

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
            assignedStages: [1, 2, 3, 4, 5, 6],
            active: u.active !== false,
          }
        : u
    )
  }

  return next
}

export function listUsers() {
  const db = readUsersDb()
  return ensureSeedUsers(db.users)
}

export function syncUsers(users) {
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

  writeUsersDb({ users: cleaned })
  return cleaned
}

export function getUsersDbPath() {
  ensureUsersDb()
  return USERS_DB_PATH
}
