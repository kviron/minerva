import { describe, expect, it } from 'vitest'
import { API_ACCESS, classifyApiAccess } from '../../../server/modules/authorization/api-access'

describe('API_ACCESS', () => {
  it('defines the complete API access vocabulary', () => {
    expect(API_ACCESS).toEqual({
      NOT_API: 'not-api',
      PUBLIC: 'public',
      AUTHENTICATED: 'authenticated',
      SUPER_ADMIN: 'super-admin',
    })
  })
})

describe('classifyApiAccess', () => {
  it.each([
    ['POST', '/api/identity/sign-in'],
    ['POST', '/api/identity/request-password-reset'],
    ['POST', '/api/identity/reset-password'],
    ['GET', '/api/health/database'],
    ['GET', '/api/health/live'],
    ['GET', '/api/health/ready'],
    ['GET', '/api/auth'],
    ['POST', '/api/auth/sign-in/email'],
    ['GET', '/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789'],
    ['GET', '/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/pages/21b9fc31-6e20-4399-a2ea-fb4de1024821'],
    ['GET', '/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/images/31b9fc31-6e20-4399-a2ea-fb4de1024821'],
  ])('classifies %s %s as public', (method, path) => {
    expect(classifyApiAccess(method, path)).toBe(API_ACCESS.PUBLIC)
  })

  it.each([
    ['GET', '/api/identity/sign-in'],
    ['GET', '/api/identity/request-password-reset'],
    ['GET', '/api/identity/reset-password'],
    ['POST', '/api/health/database'],
    ['POST', '/api/health/live'],
    ['POST', '/api/health/ready'],
    ['POST', '/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789'],
  ])('classifies method mismatch %s %s as authenticated', (method, path) => {
    expect(classifyApiAccess(method, path)).toBe(API_ACCESS.AUTHENTICATED)
  })

  it.each(['/api/future', '/api/mainMenu'])('protects %s by default', (path) => {
    expect(classifyApiAccess('GET', path)).toBe(API_ACCESS.AUTHENTICATED)
  })

  it.each(['/api/administration', '/api/administration/users'])('requires super-admin for %s', (path) => {
    expect(classifyApiAccess('GET', path)).toBe(API_ACCESS.SUPER_ADMIN)
  })

  it.each(['/', '/catalog', '/apiary'])('ignores non-API path %s', (path) => {
    expect(classifyApiAccess('GET', path)).toBe(API_ACCESS.NOT_API)
  })

  it.each([
    '/api/authentication',
    '/api/identity/sign-in/extra',
    '/api/identity/request-password-resetting',
    '/api/health/database-status',
    '/api/administration-tools',
    '/api/public',
    '/api/public/documentation',
    '/api/public/documentation/short-token',
    '/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/pages/not-a-uuid',
    '/api/public/documentation/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789/unknown/21b9fc31-6e20-4399-a2ea-fb4de1024821',
  ])('does not broaden access for near-miss path %s', (path) => {
    expect(classifyApiAccess('POST', path)).toBe(API_ACCESS.AUTHENTICATED)
  })
})
