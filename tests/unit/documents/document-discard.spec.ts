import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  DISCARD_DOCUMENT_ERROR,
  discardDocumentWith,
  planDocumentDiscard,
} from '../../../server/modules/documents/document-archive'

const rows = [
  { id: 'root-a', parentId: null, position: 0, publicationState: 'draft' },
  { id: 'root-b', parentId: null, position: 1, publicationState: 'draft' },
  { id: 'root-c', parentId: null, position: 2, publicationState: 'draft' },
  { id: 'child', parentId: 'root-b', position: 0, publicationState: 'draft' },
] as const

const base = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  documentId: '00000000-0000-4000-8000-000000000003',
  channel: 'web',
} as const

describe('discard never-published document branches', () => {
  it('plans deletion of the complete draft branch and compacts source siblings', () => {
    expect(planDocumentDiscard(rows, 'root-b', new Set())).toEqual({
      ok: true,
      value: {
        deletedIds: ['root-b', 'child'],
        rootParentId: null,
        rootPosition: 1,
        siblingPlacements: [
          { id: 'root-a', parentId: null, position: 0 },
          { id: 'root-c', parentId: null, position: 1 },
        ],
      },
    })
  })

  it('rejects published state and historical versions anywhere in the branch', () => {
    expect(planDocumentDiscard(
      rows.map(row => row.id === 'child' ? { ...row, publicationState: 'published' as const } : row),
      'root-b',
      new Set(),
    )).toEqual({ ok: false, code: DISCARD_DOCUMENT_ERROR.NOT_DISCARDABLE })
    expect(planDocumentDiscard(rows, 'root-b', new Set(['child'])))
      .toEqual({ ok: false, code: DISCARD_DOCUMENT_ERROR.NOT_DISCARDABLE })
    expect(planDocumentDiscard(rows, 'missing', new Set()))
      .toEqual({ ok: false, code: DISCARD_DOCUMENT_ERROR.NOT_FOUND })
  })

  it('maps expected persistence results without turning domain rejection into an exception', async () => {
    const discard = vi.fn().mockResolvedValue({ ok: true, deletedCount: 2, deletedAt: '2026-07-14T12:00:00.000Z' })
    await expect(discardDocumentWith({ discard })(base)).resolves.toEqual({
      ok: true,
      value: { deletedCount: 2, deletedAt: '2026-07-14T12:00:00.000Z' },
    })
  })

  it('uses a thin authenticated Nitro boundary', async () => {
    const handler = await readFile('server/api/projects/[id]/documents/[documentId]/discard.delete.ts', 'utf8')
    expect(handler).toContain('requireSession(event)')
    expect(handler).toContain('discardDocument({')
  })
})
