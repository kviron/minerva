import { describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  MOVE_DOCUMENT_ERROR,
  moveDocumentWith,
  planDocumentMove,
  validateMoveDocument,
} from '../../../server/modules/documents/move-document'

const rows = [
  { id: 'root-a', parentId: null, position: 0 },
  { id: 'root-b', parentId: null, position: 1 },
  { id: 'child-a', parentId: 'root-a', position: 0 },
  { id: 'child-b', parentId: 'root-a', position: 1 },
  { id: 'grandchild', parentId: 'child-a', position: 0 },
] as const

const base = {
  actorUserId: '00000000-0000-4000-8000-000000000001',
  projectId: '00000000-0000-4000-8000-000000000002',
  documentId: '00000000-0000-4000-8000-000000000003',
  channel: 'web',
} as const

describe('document tree movement', () => {
  it('validates a zero-based target position', () => {
    expect(validateMoveDocument({ ...base, targetParentId: null, targetPosition: 0 })).toEqual({
      ok: true,
      value: { ...base, targetParentId: null, targetPosition: 0 },
    })
    expect(validateMoveDocument({ ...base, targetParentId: null, targetPosition: -1 })).toEqual({
      ok: false,
      code: MOVE_DOCUMENT_ERROR.INVALID_MOVE,
    })
    expect(validateMoveDocument({ ...base, targetParentId: null, targetPosition: 1.5 })).toEqual({
      ok: false,
      code: MOVE_DOCUMENT_ERROR.INVALID_MOVE,
    })
  })

  it('reorders siblings after removing the source from its current list', () => {
    expect(planDocumentMove(rows, 'child-b', 'root-a', 0)).toEqual({
      ok: true,
      value: [
        { id: 'child-b', parentId: 'root-a', position: 0 },
        { id: 'child-a', parentId: 'root-a', position: 1 },
      ],
    })
  })

  it('moves between parents and compacts both sibling lists', () => {
    expect(planDocumentMove(rows, 'child-a', 'root-b', 0)).toEqual({
      ok: true,
      value: [
        { id: 'child-b', parentId: 'root-a', position: 0 },
        { id: 'child-a', parentId: 'root-b', position: 0 },
      ],
    })
  })

  it('rejects missing parents, invalid positions, self-parenting, and descendant cycles', () => {
    expect(planDocumentMove(rows, 'child-a', 'missing', 0)).toEqual({ ok: false, code: MOVE_DOCUMENT_ERROR.NOT_FOUND })
    expect(planDocumentMove(rows, 'child-a', 'root-b', 1)).toEqual({ ok: false, code: MOVE_DOCUMENT_ERROR.INVALID_MOVE })
    expect(planDocumentMove(rows, 'child-a', 'child-a', 0)).toEqual({ ok: false, code: MOVE_DOCUMENT_ERROR.INVALID_MOVE })
    expect(planDocumentMove(rows, 'root-a', 'grandchild', 0)).toEqual({ ok: false, code: MOVE_DOCUMENT_ERROR.INVALID_MOVE })
  })

  it('maps expected persistence outcomes without throwing domain failures', async () => {
    const persist = vi.fn().mockResolvedValue({
      ok: true,
      parentId: null,
      position: 1,
      updatedAt: '2026-07-14T12:00:00.000Z',
    })
    await expect(moveDocumentWith({ persist })({
      ...base,
      targetParentId: null,
      targetPosition: 1,
    })).resolves.toEqual({
      ok: true,
      value: { parentId: null, position: 1, updatedAt: '2026-07-14T12:00:00.000Z' },
    })
    expect(persist).toHaveBeenCalledOnce()
  })

  it('uses a strict body schema and a thin authenticated Nitro boundary', async () => {
    const [schemas, handler] = await Promise.all([
      readFile('server/modules/documents/http-schemas.ts', 'utf8'),
      readFile('server/api/projects/[id]/documents/[documentId]/move.patch.ts', 'utf8'),
    ])
    expect(schemas).toContain('moveDocumentBodySchema')
    expect(schemas).toContain('targetPosition: z.number().int().nonnegative()')
    expect(handler).toContain('requireSession(event)')
    expect(handler).toContain('moveDocumentBodySchema.safeParse')
    expect(handler).toContain('moveDocument({')
  })
})
