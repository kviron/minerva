import { describe, expect, expectTypeOf, it } from 'vitest'
import { CREDENTIAL_FIELD_TYPE } from '../../../shared/credentials/constants'
import { archivedCredentialListResponseSchema, credentialListResponseSchema } from '../../../shared/credentials/contracts'
import type { CredentialFieldType } from '../../../shared/credentials/types'

describe('credential closed sets', () => {
  it('defines the approved dynamic field types', () => {
    expect(CREDENTIAL_FIELD_TYPE).toEqual({
      TEXT: 'text',
      SECRET: 'secret',
      URL: 'url',
      NOTE: 'note',
    })
    expectTypeOf(CREDENTIAL_FIELD_TYPE.SECRET).toEqualTypeOf<CredentialFieldType>()
  })

  it('validates masked list projections without accepting secret values', () => {
    const item = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Production',
      category: { id: '22222222-2222-4222-8222-222222222222', name: 'Servers' },
      login: 'admin@example.com',
      hasLogin: true,
      hasPassword: true,
      dynamicFields: [{ id: '33333333-3333-4333-8333-333333333333', label: 'Token', type: 'secret' }],
      updatedAt: '2026-07-13T10:00:00.000Z',
      updatedBy: { name: 'Admin', avatar: null },
      canUpdate: true,
      canArchive: true,
    }

    expect(credentialListResponseSchema.parse([item])).toEqual([item])
    expect(() => credentialListResponseSchema.parse([{ ...item, password: 'secret' }])).toThrow()
  })

  it('validates archived projections without accepting plaintext fields', () => {
    const item = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Production',
      category: { id: '22222222-2222-4222-8222-222222222222', name: 'Servers' },
      hasLogin: true,
      hasPassword: true,
      dynamicFieldCount: 2,
      archivedAt: '2026-07-13T10:00:00.000Z',
      archivedBy: { name: 'Admin' },
    }

    expect(archivedCredentialListResponseSchema.parse([item])).toEqual([item])
    expect(() => archivedCredentialListResponseSchema.parse([{ ...item, login: 'private' }])).toThrow()
  })
})
