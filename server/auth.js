import { ADMIN_LOGIN, ADMIN_PASSWORD } from './config.js'

export function verifyAdmin(req) {
  const login = req.headers['x-admin-login']
  const password = req.headers['x-admin-password']

  if (
    typeof login !== 'string' ||
    typeof password !== 'string' ||
    login.trim().toLowerCase() !== ADMIN_LOGIN.toLowerCase() ||
    password !== ADMIN_PASSWORD
  ) {
    return null
  }

  return { login: login.trim().toLowerCase() }
}

export function verifyApiKey(req) {
  const expected = process.env.API_KEY?.trim()
  if (!expected) return true

  const header = req.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return false
  }

  return header.slice(7) === expected
}
