import { describe, expect, it } from 'vitest'
import { parseAdministrationUsersResponse } from '../../../../app/features/administration/api/users-api'

describe('administration users API parser', () => {
  it('accepts the safe user projection', () => {
    expect(parseAdministrationUsersResponse([{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Анна Иванова',
      email: 'anna@example.com',
      username: 'anna',
      status: 'active',
      superAdmin: true,
      createdAt: '2026-07-01T10:00:00.000Z',
      lastLoginAt: null,
    }])).toHaveLength(1)
  })

  it('rejects private, extra, and malformed fields', () => {
    expect(() => parseAdministrationUsersResponse([{
      id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
      name: 'Анна Иванова',
      email: 'anna@example.com',
      username: null,
      status: 'active',
      superAdmin: false,
      createdAt: '2026-07-01T10:00:00.000Z',
      lastLoginAt: null,
      disabledReason: 'private',
    }])).toThrow('Invalid administration users response')
  })
})
