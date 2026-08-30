import { describe, expect, it } from 'vitest'
import { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../../shared/documents/public-share-constants'
import {
  derivePublicDocumentProjection,
  type PublicDocumentCandidate,
} from '../../../server/modules/documents/public-document-projection'

const rootId = '00000000-0000-4000-8000-000000000501'
const childId = '00000000-0000-4000-8000-000000000502'
const grandchildId = '00000000-0000-4000-8000-000000000503'
const siblingId = '00000000-0000-4000-8000-000000000504'

const candidate = (
  id: string,
  parentId: string | null,
  title: string | null,
  position = 0,
): PublicDocumentCandidate => ({
  id,
  parentId,
  position,
  slug: `page-${id.at(-1)}`,
  version: title === null ? null : {
    title,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: title }] }] },
    publishedAt: '2026-08-02T12:00:00.000Z',
    referencedImageIds: [],
  },
})

describe('public document projection', () => {
  it('keeps an exact share limited to the published root', () => {
    const result = derivePublicDocumentProjection({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
      rootDocumentId: rootId,
      selectedDocumentId: childId,
      documents: [candidate(rootId, null, 'Published root'), candidate(childId, rootId, 'Child')],
    })
    expect(result).toBeNull()
    expect(derivePublicDocumentProjection({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
      rootDocumentId: rootId,
      selectedDocumentId: rootId,
      documents: [candidate(rootId, null, 'Published root'), candidate(childId, rootId, 'Child')],
    })).toMatchObject({ page: { id: rootId }, tree: [] })
  })

  it('derives the ordered descendant closure and removes an unpublished chain', () => {
    const result = derivePublicDocumentProjection({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
      rootDocumentId: rootId,
      selectedDocumentId: rootId,
      documents: [
        candidate(grandchildId, childId, 'Hidden behind draft'),
        candidate(siblingId, rootId, 'Visible sibling', 1),
        candidate(rootId, null, 'Published root'),
        candidate(childId, rootId, null, 0),
      ],
    })
    expect(result?.tree).toEqual([{
      id: rootId,
      title: 'Published root',
      slug: 'page-1',
      children: [{ id: siblingId, title: 'Visible sibling', slug: 'page-4', children: [] }],
    }])
    expect(result?.eligibleDocumentIds).toEqual([rootId, siblingId])
  })

  it('uses only the supplied latest snapshot and exposes internal-link availability', () => {
    const linked = candidate(rootId, null, 'Latest title')
    const withLinks: PublicDocumentCandidate = {
      ...linked,
      version: linked.version && {
        ...linked.version,
        content: { type: 'doc', content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: 'Links',
            marks: [
              { type: 'link', attrs: { href: `document:${childId}` } },
              { type: 'link', attrs: { href: `document:${grandchildId}` } },
            ],
          }],
        }] },
      },
    }
    const result = derivePublicDocumentProjection({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
      rootDocumentId: rootId,
      selectedDocumentId: rootId,
      documents: [withLinks, candidate(childId, rootId, 'Visible child')],
    })
    expect(result?.page.internalLinks).toEqual([
      { documentId: childId, available: true },
      { documentId: grandchildId, available: false },
    ])
  })

  it('returns unavailable when the root or selected page has no eligible published chain', () => {
    expect(derivePublicDocumentProjection({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
      rootDocumentId: rootId,
      selectedDocumentId: rootId,
      documents: [candidate(rootId, null, null)],
    })).toBeNull()
    expect(derivePublicDocumentProjection({
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
      rootDocumentId: rootId,
      selectedDocumentId: childId,
      documents: [candidate(rootId, null, 'Root'), candidate(childId, rootId, null)],
    })).toBeNull()
  })
})
