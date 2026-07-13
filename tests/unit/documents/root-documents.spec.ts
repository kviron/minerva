import { describe, expect, it } from 'vitest'
import { buildRootDocumentList } from '../../../server/modules/documents/list-root-documents'

describe('root document list', () => {
  it('returns only active root documents in manual order and counts direct children', () => {
    const rows = [
      { id: 'root-b', title: 'Эксплуатация', slug: 'operations', parentId: null, position: 1, updatedAt: new Date('2026-07-12T10:00:00.000Z'), publicationState: 'published', archivedAt: null },
      { id: 'child-a', title: 'Архитектура API', slug: 'api', parentId: 'root-a', position: 0, updatedAt: new Date('2026-07-11T10:00:00.000Z'), publicationState: 'draft', archivedAt: null },
      { id: 'root-a', title: 'Архитектура', slug: 'architecture', parentId: null, position: 0, updatedAt: new Date('2026-07-13T10:00:00.000Z'), publicationState: 'draft', archivedAt: null },
      { id: 'archived-child', title: 'Старая страница', slug: 'old', parentId: 'root-a', position: 1, updatedAt: new Date('2026-07-10T10:00:00.000Z'), publicationState: 'draft', archivedAt: new Date('2026-07-13T11:00:00.000Z') },
    ] as const

    expect(buildRootDocumentList(rows)).toEqual([
      {
        id: 'root-a',
        title: 'Архитектура',
        slug: 'architecture',
        childCount: 1,
        updatedAt: '2026-07-13T10:00:00.000Z',
        publicationState: 'draft',
      },
      {
        id: 'root-b',
        title: 'Эксплуатация',
        slug: 'operations',
        childCount: 0,
        updatedAt: '2026-07-12T10:00:00.000Z',
        publicationState: 'published',
      },
    ])
  })
})
