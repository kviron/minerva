import { describe, expect, expectTypeOf, it } from 'vitest'
import { parseCategoryIdResponse, parseCategoryManagement, parseCategoryMutationResponse } from '../../../../app/features/credentials/api/category-api'
import type {
  CredentialCategory,
  CredentialCategoryBody,
  CredentialCategoryListItem,
} from '../../../../shared/credentials/category-contracts'

describe('category API response parsing', () => {
  it('composes storage projections and API projections from one shared category shape', () => {
    expectTypeOf<CredentialCategoryListItem>().toMatchTypeOf<Pick<CredentialCategory, 'id' | 'name' | 'description'>>()
    expectTypeOf<CredentialCategoryBody>().toMatchTypeOf<Pick<CredentialCategory, 'name' | 'description'>>()
  })

  it('parses mutation responses through explicit contracts', () => {
    expect(parseCategoryIdResponse({ categoryId: 'category-1' })).toEqual({ categoryId: 'category-1' })
    expect(parseCategoryMutationResponse({ ok: true })).toEqual({ ok: true })
  })

  it.each([
    ['category id', () => parseCategoryIdResponse({ categoryId: 1 })],
    ['mutation acknowledgement', () => parseCategoryMutationResponse({ ok: false })],
    ['management payload', () => parseCategoryManagement({})],
  ])('rejects an invalid %s response', (_name, parse) => {
    expect(parse).toThrow('Invalid credential category response')
  })
})
