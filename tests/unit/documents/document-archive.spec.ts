import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  ARCHIVE_DOCUMENT_ERROR,
  archiveDocumentWith,
  planDocumentArchive,
  planDocumentRestore,
  restoreDocumentWith,
} from '../../../server/modules/documents/document-archive'

const rows = [
  { id: 'root-a', parentId: null, position: 0 },
  { id: 'root-b', parentId: null, position: 1 },
  { id: 'root-c', parentId: null, position: 2 },
  { id: 'child-a', parentId: 'root-b', position: 0 },
  { id: 'child-b', parentId: 'root-b', position: 1 },
  { id: 'grandchild', parentId: 'child-a', position: 0 },
] as const

const base = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  documentId: '00000000-0000-4000-8000-000000000003',
  channel: 'web',
} as const

describe('document archive and restore', () => {
  it('plans one recoverable branch batch and compacts the active source siblings', () => {
    expect(planDocumentArchive(rows, 'root-b')).toEqual({
      ok: true,
      value: {
        archivedIds: ['root-b', 'child-a', 'grandchild', 'child-b'],
        rootParentId: null,
        rootPosition: 1,
        siblingPlacements: [
          { id: 'root-a', parentId: null, position: 0 },
          { id: 'root-c', parentId: null, position: 1 },
        ],
      },
    })
    expect(planDocumentArchive(rows, 'missing')).toEqual({ ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND })
  })

  it('restores a batch root at the nearest valid original sibling position', () => {
    expect(planDocumentRestore([
      { id: 'root-a', parentId: null, position: 0 },
      { id: 'root-c', parentId: null, position: 1 },
    ], { id: 'root-b', parentId: null, position: 4 })).toEqual({
      ok: true,
      value: [
        { id: 'root-a', parentId: null, position: 0 },
        { id: 'root-c', parentId: null, position: 1 },
        { id: 'root-b', parentId: null, position: 2 },
      ],
    })
    expect(planDocumentRestore(rows, { id: 'archived', parentId: 'missing', position: 0 }))
      .toEqual({ ok: false, code: ARCHIVE_DOCUMENT_ERROR.NOT_FOUND })
  })

  it('maps archive and restore persistence outcomes', async () => {
    const archive = vi.fn().mockResolvedValue({ ok: true, archiveBatchId: base.documentId, archivedCount: 3, archivedAt: '2026-07-14T12:00:00.000Z' })
    const restore = vi.fn().mockResolvedValue({ ok: true, restoredCount: 3, restoredAt: '2026-07-14T13:00:00.000Z' })

    await expect(archiveDocumentWith({ archive })(base)).resolves.toMatchObject({ ok: true, value: { archivedCount: 3 } })
    await expect(restoreDocumentWith({ restore })(base)).resolves.toMatchObject({ ok: true, value: { restoredCount: 3 } })
  })

  it('uses thin authenticated archive/list/restore Nitro boundaries', async () => {
    const [archiveHandler, listHandler, restoreHandler] = await Promise.all([
      readFile('server/api/projects/[id]/documents/[documentId].delete.ts', 'utf8'),
      readFile('server/api/projects/[id]/documents/archive.get.ts', 'utf8'),
      readFile('server/api/projects/[id]/documents/[documentId]/restore.post.ts', 'utf8'),
    ])
    expect(archiveHandler).toContain('archiveDocument({')
    expect(listHandler).toContain('listArchivedDocumentBatches(')
    expect(restoreHandler).toContain('restoreDocument({')
    expect(`${archiveHandler}${listHandler}${restoreHandler}`).toContain('requireSession(event)')
  })
})
