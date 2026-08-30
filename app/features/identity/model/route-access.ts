import type { IdentitySessionView } from '../../../../shared/identity/session'

export type RouteAccessDecision =
  | { readonly type: 'allow' }
  | { readonly type: 'error' }
  | { readonly type: 'redirect', readonly to: '/auth' | '/dashboard' }

interface RouteAccessInput {
  readonly path: string
  readonly session: IdentitySessionView | null
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
    || isPublicDocumentationPath(path)
}

function isPublicDocumentationPath(path: string): boolean {
  const segments = path.split('/').filter(Boolean)
  const documentId = segments[3]
  return segments.length >= 3
    && segments.length <= 4
    && segments[0] === 'share'
    && segments[1] === 'documentation'
    && segments[2]?.length === 43
    && /^[A-Za-z0-9_-]+$/u.test(segments[2])
    && (documentId === undefined || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(documentId))
}

function isAdministrationPath(path: string): boolean {
  return path === '/administration' || path.startsWith('/administration/')
}

export function decideRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (input.sessionError)
    return { type: 'error' }

  if (!input.session)
    return isPublicPath(input.path) ? { type: 'allow' } : { type: 'redirect', to: '/auth' }

  if (input.path === '/' || input.path === '/auth')
    return { type: 'redirect', to: '/dashboard' }

  if (isAdministrationPath(input.path) && input.session.user.superAdmin !== true)
    return { type: 'redirect', to: '/dashboard' }

  return { type: 'allow' }
}
