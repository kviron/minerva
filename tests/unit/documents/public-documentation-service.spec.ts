import { describe, expect, it, vi } from 'vitest'
import { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../../shared/documents/public-share-constants'
import {
  createPublicDocumentationService,
  type PublicDocumentationRepository,
} from '../../../server/modules/documents/public-documentation'

const token = 'B'.repeat(43)
const projectId = '00000000-0000-4000-8000-000000000511'
const rootDocumentId = '00000000-0000-4000-8000-000000000512'
const childDocumentId = '00000000-0000-4000-8000-000000000513'
const imageId = '00000000-0000-4000-8000-000000000514'

const repository = (): PublicDocumentationRepository => ({
  loadScope: vi.fn().mockResolvedValue({
    projectId,
    projectName: 'Public project',
    rootDocumentId,
    scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
    documents: [
      {
        id: rootDocumentId,
        parentId: null,
        position: 0,
        slug: 'root',
        version: {
          title: 'Published root',
          content: { type: 'doc', content: [] },
          publishedAt: '2026-08-02T12:00:00.000Z',
          referencedImageIds: [imageId],
        },
      },
      {
        id: childDocumentId,
        parentId: rootDocumentId,
        position: 0,
        slug: 'child',
        version: {
          title: 'Published child',
          content: { type: 'doc', content: [] },
          publishedAt: '2026-08-02T13:00:00.000Z',
          referencedImageIds: [],
        },
      },
    ],
  }),
  loadImageMetadata: vi.fn().mockResolvedValue({
    objectKey: 'private/object-key',
    filename: 'diagram.png',
    mimeType: 'image/png',
  }),
})

describe('public documentation service', () => {
  it('validates and hashes the capability before loading a public page', async () => {
    const repo = repository()
    const service = createPublicDocumentationService({ repository: repo })
    await expect(service.readPage({ token, selectedDocumentId: childDocumentId }))
      .resolves.toMatchObject({
        scope: 'branch',
        projectName: 'Public project',
        page: { id: childDocumentId, title: 'Published child' },
      })
    expect(repo.loadScope).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{64}$/u))
    expect(JSON.stringify(vi.mocked(repo.loadScope).mock.calls)).not.toContain(token)
  })

  it('uses one indistinguishable unavailable result for malformed, unknown, revoked or out-of-scope access', async () => {
    const repo = repository()
    const service = createPublicDocumentationService({ repository: repo })
    await expect(service.readPage({ token: 'bad', selectedDocumentId: null })).resolves.toBeNull()
    expect(repo.loadScope).not.toHaveBeenCalled()
    vi.mocked(repo.loadScope).mockResolvedValueOnce(null)
    await expect(service.readPage({ token, selectedDocumentId: null })).resolves.toBeNull()
    await expect(service.readPage({
      token,
      selectedDocumentId: '00000000-0000-4000-8000-000000000599',
    })).resolves.toBeNull()
  })

  it('loads an image only when an eligible latest snapshot references it', async () => {
    const repo = repository()
    const service = createPublicDocumentationService({ repository: repo })
    await expect(service.resolveImage({ token, imageId })).resolves.toEqual({
      objectKey: 'private/object-key',
      filename: 'diagram.png',
      mimeType: 'image/png',
    })
    expect(repo.loadImageMetadata).toHaveBeenCalledWith(projectId, imageId)
    await expect(service.resolveImage({
      token,
      imageId: '00000000-0000-4000-8000-000000000598',
    })).resolves.toBeNull()
  })
})
