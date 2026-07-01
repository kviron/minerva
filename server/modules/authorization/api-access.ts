export const API_ACCESS = {
  NOT_API: 'not-api',
  PUBLIC: 'public',
  AUTHENTICATED: 'authenticated',
  SUPER_ADMIN: 'super-admin',
} as const

export type ApiAccess = typeof API_ACCESS[keyof typeof API_ACCESS]

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
    return API_ACCESS.NOT_API
  }

  if (isPathOrDescendant(path, '/api/auth') || PUBLIC_ENDPOINTS.has(`${method.toUpperCase()} ${path}`)) {
    return API_ACCESS.PUBLIC
  }

  if (isPathOrDescendant(path, '/api/administration')) {
    return API_ACCESS.SUPER_ADMIN
  }

  return API_ACCESS.AUTHENTICATED
}
