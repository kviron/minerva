export type RouteAccessDecision =
  | { readonly type: 'allow' }
  | { readonly type: 'error' }
  | { readonly type: 'redirect', readonly to: '/auth' | '/projects' }

interface IdentitySession {
  readonly user: object
}

interface RouteAccessInput {
  readonly path: string
  readonly session: IdentitySession | null
  readonly sessionError: boolean
}

const exactPublicPaths = new Set([
  '/auth',
  '/auth/forgot-password',
  '/legal/terms',
  '/legal/privacy',
])

function hasSingleSegmentAfter(path: string, prefix: string): boolean {
  if (!path.startsWith(prefix))
    return false

  const segment = path.slice(prefix.length)
  return segment.length > 0 && !segment.includes('/')
}

function isPublicPath(path: string): boolean {
  return exactPublicPaths.has(path)
    || hasSingleSegmentAfter(path, '/auth/reset-password/')
    || hasSingleSegmentAfter(path, '/invitations/')
}

function isAdministrationPath(path: string): boolean {
  return path === '/administration' || path.startsWith('/administration/')
}

function isSuperAdmin(session: IdentitySession): boolean {
  return 'superAdmin' in session.user && session.user.superAdmin === true
}

export function decideRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (input.sessionError)
    return { type: 'error' }

  if (!input.session)
    return isPublicPath(input.path) ? { type: 'allow' } : { type: 'redirect', to: '/auth' }

  if (input.path === '/auth')
    return { type: 'redirect', to: '/projects' }

  if (isAdministrationPath(input.path) && !isSuperAdmin(input.session))
    return { type: 'redirect', to: '/projects' }

  return { type: 'allow' }
}
