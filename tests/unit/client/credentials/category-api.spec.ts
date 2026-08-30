import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { categoryApi } from '../../../../app/features/credentials/api/category-api'
import {
  credentialCategoryIdResponseSchema,
  credentialCategoryManagementSchema,
  credentialCategoryMutationResponseSchema,
  type CredentialCategory,
  type CredentialCategoryBody,
  type CredentialCategoryListItem,
} from '../../../../shared/credentials/category-contracts'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

describe('category API contracts', () => {
  it('composes storage projections and API projections from one shared category shape', () => {
    expectTypeOf<CredentialCategoryListItem>().toMatchTypeOf<Pick<CredentialCategory, 'id' | 'name' | 'description'>>()
    expectTypeOf<CredentialCategoryBody>().toMatchTypeOf<Pick<CredentialCategory, 'name' | 'description'>>()
  })

  it('parses mutation responses through explicit shared contracts', () => {
    const categoryId = '11111111-1111-4111-8111-111111111111'
    expect(credentialCategoryIdResponseSchema.parse({ categoryId })).toEqual({ categoryId })
    expect(credentialCategoryMutationResponseSchema.parse({ ok: true })).toEqual({ ok: true })
  })

  it('rejects invalid contract payloads', () => {
    expect(() => credentialCategoryIdResponseSchema.parse({ categoryId: 1 })).toThrow()
    expect(() => credentialCategoryMutationResponseSchema.parse({ ok: false })).toThrow()
    expect(() => credentialCategoryManagementSchema.parse({})).toThrow()
  })

  it('validates unknown API responses through the shared decoder', async () => {
    fetchMock.mockResolvedValue({ ok: false })

    await expect(categoryApi.archive(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      new AbortController().signal,
    )).rejects.toThrow('Invalid API response: DELETE /api/projects/:projectId/credential-categories/:categoryId')
  })
})
