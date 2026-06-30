export type ApiAccess = 'not-api' | 'public' | 'authenticated' | 'super-admin'

const PUBLIC_ENDPOINTS = new Set([
  'POST /api/identity/sign-in',
  'POST /api/identity/request-password-reset',
  'POST /api/identity/reset-password',
  'GET /api/health/database',
])

function isPathOrDescendant(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`)
}

export function classifyApiAccess(method: string, path: string): ApiAccess {
  if (!isPathOrDescendant(path, '/api')) {
    return 'not-api'
  }

  if (isPathOrDescendant(path, '/api/auth') || PUBLIC_ENDPOINTS.has(`${method.toUpperCase()} ${path}`)) {
    return 'public'
  }

  if (isPathOrDescendant(path, '/api/administration')) {
    return 'super-admin'
  }

  return 'authenticated'
}
