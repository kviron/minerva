import { beforeEach, describe, expect, it, vi } from 'vitest'
import { administrationUsersApi } from '../../../../app/features/administration/api/users-api'

const fetchMock = vi.fn()
const user = {
  id: '21b9fc31-6e20-4399-a2ea-fb4de1024821',
  name: 'Анна Иванова',
  email: 'anna@example.com',
  username: 'anna',
  status: 'active',
  superAdmin: true,
  createdAt: '2026-07-01T10:00:00.000Z',
  lastLoginAt: null,
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('administration users API adapter', () => {
  it('accepts the safe user projection', async () => {
    fetchMock.mockResolvedValue([user])

    await expect(administrationUsersApi.list()).resolves.toEqual([user])
  })

  it('rejects private, extra, and malformed fields', async () => {
    fetchMock.mockResolvedValue([{ ...user, disabledReason: 'private' }])

    await expect(administrationUsersApi.list()).rejects.toThrow('Invalid API response: GET /api/administration/users')
  })
})
