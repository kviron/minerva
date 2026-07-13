import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  UPDATE_DOCUMENT_DRAFT_ERROR,
  updateDocumentDraftWith,
  validateDocumentDraftUpdate,
} from '../../../server/modules/documents/update-document-draft'

const input = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  documentId: '00000000-0000-4000-8000-000000000003',
  channel: 'web',
  title: '  Архитектура  ',
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Новая версия' }] }] },
  expectedRevision: 4,
} as const

describe('update document draft', () => {
  it('normalizes a valid update and rejects invalid revisions, titles, and Tiptap nodes', () => {
    expect(validateDocumentDraftUpdate(input)).toEqual({
      ok: true,
      value: { ...input, title: 'Архитектура' },
    })
    expect(validateDocumentDraftUpdate({ ...input, expectedRevision: -1 })).toEqual({
      ok: false,
      code: UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT,
    })
    expect(validateDocumentDraftUpdate({ ...input, title: ' ' })).toEqual({
      ok: false,
      code: UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT,
    })
    expect(validateDocumentDraftUpdate({
      ...input,
      content: { type: 'doc', content: [{ type: 'script', content: [] }] },
    })).toEqual({ ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.INVALID_DRAFT })
  })

  it('persists only validated content and preserves an optimistic conflict result', async () => {
    const persist = vi.fn()
      .mockResolvedValueOnce({ ok: true, draftRevision: 5, updatedAt: '2026-07-14T12:00:00.000Z' })
      .mockResolvedValueOnce({ ok: false, code: UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT })
    const update = updateDocumentDraftWith({ persist })

    await expect(update(input)).resolves.toEqual({
      ok: true,
      value: { draftRevision: 5, updatedAt: '2026-07-14T12:00:00.000Z' },
    })
    await expect(update(input)).resolves.toEqual({
      ok: false,
      code: UPDATE_DOCUMENT_DRAFT_ERROR.DRAFT_CONFLICT,
    })
    expect(persist).toHaveBeenNthCalledWith(1, { ...input, title: 'Архитектура' })
  })

  it('keeps the PATCH boundary strict and authorization in the shared service', async () => {
    const [handler, service] = await Promise.all([
      readFile('server/api/projects/[id]/documents/[documentId]/draft.patch.ts', 'utf8'),
      readFile('server/modules/documents/update-document-draft.ts', 'utf8'),
    ])
    expect(handler).toContain('updateDocumentDraftBodySchema.safeParse')
    expect(handler).toContain('? 409')
    expect(handler).toContain('requireSession')
    expect(service).toContain('PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT')
    expect(service).not.toMatch(/role(?:Name|Kind)|PROJECT_ROLE/u)
  })
})
