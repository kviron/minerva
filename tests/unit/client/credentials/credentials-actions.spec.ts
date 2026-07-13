import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  categoryApi: {
    load: vi.fn(), create: vi.fn(), update: vi.fn(), replaceGrants: vi.fn(), archive: vi.fn(),
  },
  credentialsApi: {
    load: vi.fn(), create: vi.fn(), update: vi.fn(), reveal: vi.fn(), archive: vi.fn(),
  },
  writeText: vi.fn(),
}))

vi.mock('../../../../app/features/credentials/api/category-api', () => ({ categoryApi: mocks.categoryApi }))
vi.mock('../../../../app/features/credentials/api/credentials-api', () => ({ credentialsApi: mocks.credentialsApi }))

import { CredentialsActions } from '../../../../app/features/credentials/model/actions/actions'
import { CredentialCategoryActions } from '../../../../app/features/credentials/model/actions/category-actions'

const contextData = {
  canManage: true, canCreateCategories: true, canCreateCredentials: true,
  categories: [], roles: [], members: [],
} as const

beforeEach(() => {
  vi.clearAllMocks()
  mocks.categoryApi.load.mockResolvedValue(contextData)
  mocks.categoryApi.create.mockResolvedValue({ categoryId: 'category-1' })
  mocks.credentialsApi.load.mockResolvedValue([])
  mocks.credentialsApi.reveal.mockResolvedValue({ value: 'secret' })
  vi.stubGlobal('navigator', { clipboard: { writeText: mocks.writeText } })
})

describe('entity-scoped credential actions', () => {
  it('uses the category API directly with explicit method arguments', async () => {
    const actions = new CredentialCategoryActions('project-1')
    await expect(actions.load()).resolves.toEqual(contextData)
    await expect(actions.save({
      categoryId: null,
      body: { name: 'Production', description: null },
      grants: { roleIds: [], membershipIds: [] },
    })).resolves.toEqual({ categoryId: 'category-1', management: contextData })
    expect(mocks.categoryApi.create).toHaveBeenCalledWith('project-1', { name: 'Production', description: null }, expect.anything())
  })

  it('uses the credentials API and clipboard directly', async () => {
    const actions = new CredentialsActions('project-1')
    await expect(actions.revealPassword('credential-1')).resolves.toBe('secret')
    await actions.copyPassword('credential-1', 'secret')
    expect(mocks.writeText).toHaveBeenCalledWith('secret')
  })
})
