import pg from 'pg'

const { Pool } = pg

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

let pool = null

export function getPool() {
  if (!hasDatabaseUrl()) return null
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.PGSSL === 'false'
          ? false
          : process.env.NODE_ENV === 'production' ||
              process.env.DATABASE_URL.includes('ondigitalocean.com')
            ? { rejectUnauthorized: false }
            : false,
    })
  }
  return pool
}

export async function query(text, params) {
  const p = getPool()
  if (!p) throw new Error('DATABASE_URL não configurada.')
  return p.query(text, params)
}

export async function initDatabase() {
  if (!hasDatabaseUrl()) {
    console.log('[Sistema Infra] Sem DATABASE_URL — usando arquivos JSON locais.')
    return { mode: 'json' }
  }

  await query(`
    CREATE TABLE IF NOT EXISTS finished_orders (
      id TEXT PRIMARY KEY,
      number TEXT,
      client TEXT,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB NOT NULL
    );
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_finished_orders_completed_at
    ON finished_orders (completed_at DESC NULLS LAST);
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      assigned_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      number TEXT,
      client TEXT,
      status TEXT,
      current_stage_id INT,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB NOT NULL
    );
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_orders_updated_at
    ON orders (updated_at DESC);
  `)

  // Seeds admin + infra
  await query(
    `
    INSERT INTO users (id, login, password, name, role, assigned_stages, active, created_at, data)
    VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, TRUE, to_timestamp(0), $7::jsonb),
      ($8, $9, $10, $11, $12, $13::jsonb, TRUE, to_timestamp(0), $14::jsonb)
    ON CONFLICT (login) DO NOTHING;
  `,
    [
      'user-admin-master',
      'adm',
      'adm123',
      'Administrador Master',
      'admin',
      JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      JSON.stringify({}),
      'user-operator-infra',
      'infra',
      'infra123',
      'Infra',
      'operator',
      JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      JSON.stringify({}),
    ]
  )

  console.log('[Sistema Infra] PostgreSQL conectado e schema pronto.')
  return { mode: 'postgres' }
}

export async function getDatabaseInfo() {
  if (!hasDatabaseUrl()) {
    return { mode: 'json', connected: false }
  }
  try {
    await query('SELECT 1')
    return { mode: 'postgres', connected: true }
  } catch (e) {
    return {
      mode: 'postgres',
      connected: false,
      error: e instanceof Error ? e.message : 'Erro de conexão',
    }
  }
}
