import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  DOCUMENT_VERSION_ERROR,
  publishDocumentWith,
  restoreDocumentVersionWith,
  validatePublishDocument,
  validateRestoreDocumentVersion,
} from '../../../server/modules/documents/document-versions'

const base = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  documentId: '00000000-0000-4000-8000-000000000003',
  channel: 'web',
} as const

describe('document publication and restore', () => {
  it('normalizes an optional publication summary and validates the expected draft revision', () => {
    expect(validatePublishDocument({ ...base, changeSummary: '  Первый выпуск  ', expectedRevision: 3 })).toEqual({
      ok: true,
      value: { ...base, changeSummary: 'Первый выпуск', expectedRevision: 3 },
    })
    expect(validatePublishDocument({ ...base, changeSummary: ' ', expectedRevision: 3 })).toEqual({
      ok: true,
      value: { ...base, changeSummary: '', expectedRevision: 3 },
    })
    expect(validatePublishDocument({ ...base, expectedRevision: 3 })).toEqual({
      ok: true,
      value: { ...base, changeSummary: '', expectedRevision: 3 },
    })
    expect(validatePublishDocument({ ...base, changeSummary: 'Выпуск', expectedRevision: -1 })).toEqual({
      ok: false,
      code: DOCUMENT_VERSION_ERROR.INVALID_REQUEST,
    })
  })

  it('publishes through an injected transaction and preserves a stale-draft conflict', async () => {
    const persist = vi.fn()
      .mockResolvedValueOnce({ ok: true, versionNumber: 1, publishedAt: '2026-07-14T12:00:00.000Z' })
      .mockResolvedValueOnce({ ok: false, code: DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT })
    const publish = publishDocumentWith({ publish: persist })
    const input = { ...base, changeSummary: 'Первый выпуск', expectedRevision: 3 }

    await expect(publish(input)).resolves.toEqual({
      ok: true,
      value: { versionNumber: 1, publishedAt: '2026-07-14T12:00:00.000Z' },
    })
    await expect(publish(input)).resolves.toEqual({ ok: false, code: DOCUMENT_VERSION_ERROR.DRAFT_CONFLICT })
  })

  it('validates and restores a version into a new optimistic draft revision', async () => {
    expect(validateRestoreDocumentVersion({ ...base, versionNumber: 0, expectedRevision: 3 })).toEqual({
      ok: false,
      code: DOCUMENT_VERSION_ERROR.INVALID_REQUEST,
    })
    const restore = vi.fn().mockResolvedValue({
      ok: true,
      draftRevision: 4,
      updatedAt: '2026-07-14T13:00:00.000Z',
      title: 'Снимок',
      content: { type: 'doc', content: [] },
    })
    await expect(restoreDocumentVersionWith({ restore })({
      ...base,
      versionNumber: 1,
      expectedRevision: 3,
    })).resolves.toEqual({
      ok: true,
      value: {
        draftRevision: 4,
        updatedAt: '2026-07-14T13:00:00.000Z',
        title: 'Снимок',
        content: { type: 'doc', content: [] },
      },
    })
  })

  it('keeps authorization in shared services and exposes strict HTTP boundaries', async () => {
    const [service, publishHandler, historyHandler, restoreHandler] = await Promise.all([
      readFile('server/modules/documents/document-versions.ts', 'utf8'),
      readFile('server/api/projects/[id]/documents/[documentId]/publish.post.ts', 'utf8'),
      readFile('server/api/projects/[id]/documents/[documentId]/versions.get.ts', 'utf8'),
      readFile('server/api/projects/[id]/documents/[documentId]/versions/[versionNumber]/restore.post.ts', 'utf8'),
    ])
    expect(service).toContain('PROJECT_PERMISSION.DOCUMENTS_PUBLISH')
    expect(service).toContain('PROJECT_PERMISSION.DOCUMENTS_VIEW_HISTORY')
    expect(service).toContain('PROJECT_PERMISSION.DOCUMENTS_UPDATE_DRAFT')
    expect(service).not.toMatch(/role(?:Name|Kind)|PROJECT_ROLE/u)
    expect(publishHandler).toContain('publishDocumentBodySchema.safeParse')
    expect(historyHandler).toContain('listDocumentVersionsForUser')
    expect(restoreHandler).toContain('restoreDocumentVersionBodySchema.safeParse')
  })
})
