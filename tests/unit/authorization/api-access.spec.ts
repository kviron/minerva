import { describe, expect, it } from 'vitest'
import { classifyApiAccess } from '../../../server/modules/authorization/api-access'

describe('classifyApiAccess', () => {
  it.each([
    ['POST', '/api/identity/sign-in'],
    ['POST', '/api/identity/request-password-reset'],
    ['POST', '/api/identity/reset-password'],
    ['GET', '/api/health/database'],
    ['GET', '/api/auth'],
    ['POST', '/api/auth/sign-in/email'],
  ])('classifies %s %s as public', (method, path) => {
    expect(classifyApiAccess(method, path)).toBe('public')
  })

  it.each([
    ['GET', '/api/identity/sign-in'],
    ['GET', '/api/identity/request-password-reset'],
    ['GET', '/api/identity/reset-password'],
    ['POST', '/api/health/database'],
  ])('classifies method mismatch %s %s as authenticated', (method, path) => {
    expect(classifyApiAccess(method, path)).toBe('authenticated')
  })

  it.each(['/api/future', '/api/mainMenu'])('protects %s by default', (path) => {
    expect(classifyApiAccess('GET', path)).toBe('authenticated')
  })

  it.each(['/api/administration', '/api/administration/users'])('requires super-admin for %s', (path) => {
    expect(classifyApiAccess('GET', path)).toBe('super-admin')
  })

  it.each(['/', '/catalog', '/apiary'])('ignores non-API path %s', (path) => {
    expect(classifyApiAccess('GET', path)).toBe('not-api')
  })

  it.each([
    '/api/authentication',
    '/api/identity/sign-in/extra',
    '/api/identity/request-password-resetting',
    '/api/health/database-status',
    '/api/administration-tools',
  ])('does not broaden access for near-miss path %s', (path) => {
    expect(classifyApiAccess('POST', path)).toBe('authenticated')
  })
})
