import { describe, expect, it } from 'vitest'
import { credentialCategorySchema } from '../../../shared/credentials/category-contracts'
import { toCredentialCategoryProjection } from '../../../server/modules/credentials/categories'

describe('credential category projections', () => {
  it('keeps database ordering fields out of the strict management contract', () => {
    const projection = toCredentialCategoryProjection({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Production',
      description: null,
      position: 3,
    }, ['22222222-2222-4222-8222-222222222222'], [])

    expect(projection).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Production',
      description: null,
      roleIds: ['22222222-2222-4222-8222-222222222222'],
      membershipIds: [],
    })
    expect(credentialCategorySchema.parse(projection)).toEqual(projection)
    expect(projection).not.toHaveProperty('position')
  })
})
