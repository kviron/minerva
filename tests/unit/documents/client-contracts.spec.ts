import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  archiveDocumentResponseSchema,
  createDocumentResponseSchema,
  documentImageUploadResponseSchema,
  documentVersionsResponseSchema,
} from '../../../shared/documents/contracts'

describe('document client contracts', () => {
  it('validates identities, timestamps, and private image URLs', () => {
    expect(createDocumentResponseSchema.parse({
      documentId: '11111111-1111-4111-8111-111111111111',
    })).toBeDefined()
    expect(archiveDocumentResponseSchema.parse({
      archiveBatchId: '22222222-2222-4222-8222-222222222222',
      archivedCount: 2,
      archivedAt: '2026-07-14T10:00:00.000Z',
    })).toBeDefined()
    expect(documentImageUploadResponseSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      filename: 'diagram.png',
      mimeType: 'image/png',
      byteSize: 100,
      url: '/api/projects/11111111-1111-4111-8111-111111111111/documents/images/33333333-3333-4333-8333-333333333333',
    })).toBeDefined()
    expect(documentVersionsResponseSchema.parse([])).toEqual([])
  })

  it('keeps response schemas in shared contracts and the API adapter generic', async () => {
    const source = await readFile('app/features/documents/api/documents-api.ts', 'utf8')

    expect(source).not.toContain("from 'zod'")
    expect(source).toContain('decodeApiResponse')
    expect(source).toContain('documentDetailResponseSchema')
    expect(source).not.toContain('parseDocumentDetailResponse')
  })
})
