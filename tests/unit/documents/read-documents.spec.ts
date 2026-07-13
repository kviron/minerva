import { describe, expect, it } from 'vitest'
import { buildDocumentDetail, buildDocumentTree } from '../../../server/modules/documents/read-documents'

const rows = [
  { id: 'root-2', title: 'Эксплуатация', slug: 'operations', parentId: null, position: 1, updatedAt: new Date('2026-07-14T12:00:00.000Z'), publicationState: 'draft', archivedAt: null },
  { id: 'child-2', title: 'Развёртывание', slug: 'deploy', parentId: 'root-1', position: 1, updatedAt: new Date('2026-07-14T11:00:00.000Z'), publicationState: 'draft', archivedAt: null },
  { id: 'root-1', title: 'Архитектура', slug: 'architecture', parentId: null, position: 0, updatedAt: new Date('2026-07-14T10:00:00.000Z'), publicationState: 'published', archivedAt: null },
  { id: 'child-1', title: 'API', slug: 'api', parentId: 'root-1', position: 0, updatedAt: new Date('2026-07-14T09:00:00.000Z'), publicationState: 'published', archivedAt: null },
  { id: 'grandchild', title: 'Авторизация', slug: 'auth', parentId: 'child-1', position: 0, updatedAt: new Date('2026-07-14T08:00:00.000Z'), publicationState: 'draft', archivedAt: null },
  { id: 'archived', title: 'Архив', slug: 'archive', parentId: null, position: 2, updatedAt: new Date('2026-07-14T07:00:00.000Z'), publicationState: 'draft', archivedAt: new Date('2026-07-14T13:00:00.000Z') },
] as const

describe('read documents', () => {
  it('builds an ordered recursive tree and excludes archived nodes', () => {
    expect(buildDocumentTree(rows)).toEqual([
      expect.objectContaining({
        id: 'root-1',
        children: [
          expect.objectContaining({
            id: 'child-1',
            children: [expect.objectContaining({ id: 'grandchild', children: [] })],
          }),
          expect.objectContaining({ id: 'child-2', children: [] }),
        ],
      }),
      expect.objectContaining({ id: 'root-2', children: [] }),
    ])
  })

  it('derives ordered ancestors and direct children for the selected document', () => {
    const detail = buildDocumentDetail({
      id: 'grandchild',
      title: 'Авторизация',
      slug: 'auth',
      parentId: 'child-1',
      draftRevision: 3,
      draftContent: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'OAuth' }] }] },
      publicationState: 'draft',
      updatedAt: new Date('2026-07-14T08:00:00.000Z'),
    }, rows)

    expect(detail.ancestors).toEqual([
      { id: 'root-1', title: 'Архитектура' },
      { id: 'child-1', title: 'API' },
    ])
    expect(detail.children).toEqual([])
    expect(detail.draftContent).toMatchObject({ type: 'doc' })
    expect(detail.draftRevision).toBe(3)
  })

  it('returns null when an ancestor chain is broken or cyclic', () => {
    const selected = {
      id: 'broken',
      title: 'Broken',
      slug: 'broken',
      parentId: 'missing',
      draftRevision: 0,
      draftContent: { type: 'doc', content: [] },
      publicationState: 'draft',
      updatedAt: new Date(),
    } as const
    expect(buildDocumentDetail(selected, rows)).toBeNull()
  })
})
