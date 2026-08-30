import { beforeEach, describe, expect, it, vi } from 'vitest'
import { documentsApi } from '../../../../app/features/documents/api/documents-api'

const projectId = '00000000-0000-4000-8000-000000000601'
const documentId = '00000000-0000-4000-8000-000000000602'
const shareId = '00000000-0000-4000-8000-000000000603'
const token = 'D'.repeat(43)
const share = {
  id: shareId,
  rootDocumentId: documentId,
  scope: 'document',
  status: 'active',
  createdAt: '2026-08-02T12:00:00.000Z',
  revokedAt: null,
}

beforeEach(() => vi.unstubAllGlobals())

describe('document shares API', () => {
  it('uses strict decoders for list, open, copy, rotate and revoke boundaries', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ shares: [share] })
      .mockResolvedValueOnce({ share, url: `https://minerva.example/share/documentation/${token}` })
      .mockResolvedValueOnce({ share, url: `https://minerva.example/share/documentation/${token}` })
      .mockResolvedValueOnce({ share, url: `https://minerva.example/share/documentation/${token}` })
      .mockResolvedValueOnce({ ...share, status: 'revoked', revokedAt: '2026-08-02T13:00:00.000Z' })
    vi.stubGlobal('$fetch', fetch)

    await expect(documentsApi.listShares(projectId, documentId)).resolves.toEqual({ shares: [share] })
    await expect(documentsApi.openShare(projectId, documentId, { scope: 'document' })).resolves.toMatchObject({ share })
    await expect(documentsApi.copyShare(projectId, documentId, shareId)).resolves.toMatchObject({ share })
    await expect(documentsApi.rotateShare(projectId, documentId, shareId)).resolves.toMatchObject({ share })
    await expect(documentsApi.revokeShare(projectId, documentId, shareId)).resolves.toMatchObject({ status: 'revoked' })

    expect(fetch).toHaveBeenNthCalledWith(1, `/api/projects/${projectId}/documents/${documentId}/shares`, { signal: undefined })
    expect(fetch).toHaveBeenNthCalledWith(2, `/api/projects/${projectId}/documents/${documentId}/shares`, {
      method: 'POST', body: { scope: 'document' }, signal: undefined,
    })
    expect(fetch).toHaveBeenNthCalledWith(5, `/api/projects/${projectId}/documents/${documentId}/shares/${shareId}`, {
      method: 'DELETE', signal: undefined,
    })
  })

  it('rejects a management response that leaks a token outside an explicit URL response', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ shares: [{ ...share, token }] }))
    await expect(documentsApi.listShares(projectId, documentId)).rejects.toThrow()
  })
})
