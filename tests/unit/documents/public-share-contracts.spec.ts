import { describe, expect, it } from 'vitest'
import {
  documentPublicShareCreateRequestSchema,
  documentPublicShareListResponseSchema,
  documentPublicShareMutationResponseSchema,
  documentPublicShareTokenSchema,
  publicDocumentationResponseSchema,
} from '../../../shared/documents/public-share-contracts'
import {
  DOCUMENT_PUBLIC_SHARE_SCOPE,
  DOCUMENT_PUBLIC_SHARE_STATUS,
} from '../../../shared/documents/public-share-constants'

const share = {
  id: '00000000-0000-4000-8000-000000000401',
  rootDocumentId: '00000000-0000-4000-8000-000000000402',
  scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
  status: DOCUMENT_PUBLIC_SHARE_STATUS.ACTIVE,
  createdAt: '2026-08-02T10:00:00.000Z',
  revokedAt: null,
} as const

describe('public document share contracts', () => {
  it('accepts only the closed create scope and rejects extra fields', () => {
    expect(documentPublicShareCreateRequestSchema.parse({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
    })).toEqual({ scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT })
    expect(() => documentPublicShareCreateRequestSchema.parse({ scope: 'project' })).toThrow()
    expect(() => documentPublicShareCreateRequestSchema.parse({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
      documentId: share.rootDocumentId,
    })).toThrow()
  })

  it('keeps management projections content-free and exposes a URL only on an explicit mutation/copy response', () => {
    expect(documentPublicShareListResponseSchema.parse({ shares: [share] }))
      .toEqual({ shares: [share] })
    expect(documentPublicShareMutationResponseSchema.parse({
      share,
      url: `https://minerva.example/share/documentation/${'A'.repeat(43)}`,
    })).toMatchObject({ share: { id: share.id }, url: expect.stringContaining('/share/documentation/') })
    expect(() => documentPublicShareListResponseSchema.parse({
      shares: [{ ...share, token: 'secret' }],
    })).toThrow()
  })

  it('requires the exact URL-safe 256-bit token representation', () => {
    expect(documentPublicShareTokenSchema.parse('a'.repeat(43))).toBe('a'.repeat(43))
    expect(() => documentPublicShareTokenSchema.parse('a'.repeat(42))).toThrow()
    expect(() => documentPublicShareTokenSchema.parse(`${'a'.repeat(42)}=`)).toThrow()
  })

  it('accepts a minimal published public projection and rejects private metadata', () => {
    const response = {
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
      rootDocumentId: share.rootDocumentId,
      projectName: 'Minerva docs',
      page: {
        id: share.rootDocumentId,
        title: 'Published page',
        slug: 'published-page',
        content: { type: 'doc', content: [] },
        publishedAt: '2026-08-02T12:00:00.000Z',
        internalLinks: [],
      },
      tree: [],
    }
    expect(publicDocumentationResponseSchema.parse(response)).toEqual(response)
    expect(() => publicDocumentationResponseSchema.parse({
      ...response,
      draftRevision: 4,
    })).toThrow()
    expect(() => publicDocumentationResponseSchema.parse({
      ...response,
      page: { ...response.page, publishedByUserId: share.id },
    })).toThrow()
  })
})
