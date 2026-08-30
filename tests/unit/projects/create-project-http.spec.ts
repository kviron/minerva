import { describe, expect, it } from 'vitest'
import { createProjectHttpStatus } from '../../../server/utils/create-project-http'

describe('createProjectHttpStatus', () => {
  it.each([
    ['AUTH_REQUIRED', 401],
    ['ACCOUNT_INACTIVE', 403],
    ['INVALID_PROJECT_NAME', 400],
    ['INVALID_PROJECT_DESCRIPTION', 400],
    ['PROJECT_CREATE_FAILED', 503],
  ] as const)('maps %s to %s', (code, status) => {
    expect(createProjectHttpStatus(code)).toBe(status)
  })
})
