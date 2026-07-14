import { describe, expect, it, vi } from 'vitest'
import {
  documentsApi,
  parseDocumentDetailResponse,
  parseDocumentTreeResponse,
} from '../../../../app/features/documents/api/documents-api'
import { DOCUMENT_DRAFT_UPDATE_CODE } from '../../../../shared/documents/constants'

const id = '6aa8d3f3-5d50-4464-b9bc-283731a27383'

describe('documents reader API boundary', () => {
  it('validates recursive tree responses', () => {
    expect(parseDocumentTreeResponse([{
      id,
      title: 'Архитектура',
      slug: 'architecture',
      updatedAt: '2026-07-14T10:00:00.000Z',
      publicationState: 'published',
      hasPublishedVersions: true,
      children: [],
    }])).toHaveLength(1)
    expect(() => parseDocumentTreeResponse([{ id, children: [] }])).toThrow('Invalid document tree response')
  })

  it('validates Tiptap content recursively and rejects unknown response fields', () => {
    const response = {
      id,
      title: 'Архитектура',
      slug: 'architecture',
      parentId: null,
      draftRevision: 1,
      draftContent: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Текст', marks: [{ type: 'bold' }] }] }],
      },
      publicationState: 'draft',
      updatedAt: '2026-07-14T10:00:00.000Z',
      ancestors: [],
      children: [],
      internalLinks: [],
      backlinks: [],
    }
    expect(parseDocumentDetailResponse(response)).toEqual(response)
    expect(() => parseDocumentDetailResponse({ ...response, storagePath: '/private/document.json' }))
      .toThrow('Invalid document detail response')
  })

  it('converts the expected HTTP conflict into a typed draft result', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue({
      data: { data: { code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT } },
    }))

    await expect(documentsApi.updateDraft('project-1', id, {
      title: 'Архитектура',
      content: { type: 'doc', content: [] },
      expectedRevision: 2,
    })).resolves.toEqual({ ok: false, code: DOCUMENT_DRAFT_UPDATE_CODE.DRAFT_CONFLICT })
  })
})
