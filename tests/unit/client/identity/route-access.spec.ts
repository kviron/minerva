import { describe, expect, it } from 'vitest'
import { decideRouteAccess } from '../../../../app/features/identity/model/route-access'

const guest = { session: null, sessionError: false }
const user = { session: { user: { superAdmin: false } }, sessionError: false }
const superAdmin = { session: { user: { superAdmin: true } }, sessionError: false }

describe('route access policy', () => {
  it.each([
    '/auth',
    '/auth/forgot-password',
    '/auth/reset-password/token',
    '/invitations/token',
    '/legal/terms',
    '/legal/privacy',
    '/share/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789',
    '/share/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/21b9fc31-6e20-4399-a2ea-fb4de1024821',
  ])('allows a guest to open public path %s', (path) => {
    expect(decideRouteAccess({ path, ...guest })).toEqual({ type: 'allow' })
  })

  it.each([
    '/auth/extra',
    '/auth/reset-password',
    '/auth/reset-password/token/extra',
    '/invitations',
    '/invitations/token/extra',
    '/legal',
    '/legal/extra',
    '/projects',
    '/share',
    '/share/documentation',
    '/share/documentation/token/page/extra',
    '/share/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/not-a-document-id',
  ])('redirects a guest from protected path %s', (path) => {
    expect(decideRouteAccess({ path, ...guest })).toEqual({ type: 'redirect', to: '/auth' })
  })

  it('redirects an authenticated user from the sign-in page', () => {
    expect(decideRouteAccess({ path: '/auth', ...user }))
      .toEqual({ type: 'redirect', to: '/dashboard' })
  })

  it('redirects an authenticated user from the root page', () => {
    expect(decideRouteAccess({ path: '/', ...user }))
      .toEqual({ type: 'redirect', to: '/dashboard' })
  })

  it.each([
    '/auth/forgot-password',
    '/auth/reset-password/token',
    '/invitations/token',
    '/legal/terms',
    '/legal/privacy',
  ])('allows an authenticated user to open standalone public path %s', (path) => {
    expect(decideRouteAccess({ path, ...user })).toEqual({ type: 'allow' })
  })

  it.each(['/administration', '/administration/users'])
    ('redirects an ordinary user from administration path %s', (path) => {
      expect(decideRouteAccess({ path, ...user }))
        .toEqual({ type: 'redirect', to: '/dashboard' })
    })

  it.each(['/administration', '/administration/users'])
    ('allows a super-administrator to open administration path %s', (path) => {
      expect(decideRouteAccess({ path, ...superAdmin })).toEqual({ type: 'allow' })
    })

  it('returns an error when session resolution fails', () => {
    expect(decideRouteAccess({ path: '/projects', session: null, sessionError: true }))
      .toEqual({ type: 'error' })
  })
})
