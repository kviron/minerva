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
  'GET /api/health/live',
  'GET /api/health/ready',
])

function isPathOrDescendant(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`)
}

const publicDocumentationToken = /^[A-Za-z0-9_-]{43}$/u
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function isPublicDocumentationEndpoint(method: string, path: string): boolean {
  if (method.toUpperCase() !== 'GET') return false
  const segments = path.split('/').filter(Boolean)
  if (
    segments[0] !== 'api'
    || segments[1] !== 'public'
    || segments[2] !== 'documentation'
    || !publicDocumentationToken.test(segments[3] ?? '')
  ) return false
  if (segments.length === 4) return true
  return segments.length === 6
    && (segments[4] === 'pages' || segments[4] === 'images')
    && uuid.test(segments[5] ?? '')
}

export function classifyApiAccess(method: string, path: string): ApiAccess {
  if (!isPathOrDescendant(path, '/api')) {
    return API_ACCESS.NOT_API
  }

  if (
    isPathOrDescendant(path, '/api/auth')
    || PUBLIC_ENDPOINTS.has(`${method.toUpperCase()} ${path}`)
    || isPublicDocumentationEndpoint(method, path)
  ) {
    return API_ACCESS.PUBLIC
  }

  if (isPathOrDescendant(path, '/api/administration')) {
    return API_ACCESS.SUPER_ADMIN
  }

  return API_ACCESS.AUTHENTICATED
}
