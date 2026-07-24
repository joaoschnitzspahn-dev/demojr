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

  // Seeds admin + infra + equipe operacional
  await query(
    `
    INSERT INTO users (id, login, password, name, role, assigned_stages, active, created_at, data)
    VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, TRUE, to_timestamp(0), '{}'::jsonb),
      ($7, $8, $9, $10, $11, $12::jsonb, TRUE, to_timestamp(0), '{}'::jsonb),
      ($13, $14, $15, $16, $17, $18::jsonb, TRUE, to_timestamp(0), '{}'::jsonb),
      ($19, $20, $21, $22, $23, $24::jsonb, TRUE, to_timestamp(0), '{}'::jsonb),
      ($25, $26, $27, $28, $29, $30::jsonb, TRUE, to_timestamp(0), '{}'::jsonb),
      ($31, $32, $33, $34, $35, $36::jsonb, TRUE, to_timestamp(0), '{}'::jsonb),
      ($37, $38, $39, $40, $41, $42::jsonb, TRUE, to_timestamp(0), '{}'::jsonb)
    ON CONFLICT (login) DO NOTHING;
  `,
    [
      'user-admin-master',
      'adm',
      'adm123',
      'Administrador Master',
      'admin',
      JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      'user-operator-infra',
      'infra',
      'infra123',
      'Infra',
      'operator',
      JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      'user-operator-kemellyn',
      'kemellyn',
      '123',
      'Kemellyn',
      'operator',
      JSON.stringify([1, 5]),
      'user-operator-josi',
      'josi',
      '123',
      'Josi',
      'operator',
      JSON.stringify([2]),
      'user-operator-expedicao',
      'expedicao',
      '123',
      'Expedição',
      'operator',
      JSON.stringify([3]),
      'user-operator-sara',
      'sara',
      '123',
      'Sara',
      'operator',
      JSON.stringify([4, 6]),
      'user-operator-rodrigo',
      'rodrigo',
      '123',
      'Rodrigo',
      'operator',
      JSON.stringify([7]),
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
