import { describe, expect, it, vi } from 'vitest'
import {
  createDocumentPublicShareManagementService,
  DOCUMENT_PUBLIC_SHARE_ERROR,
  type DocumentPublicShareRepository,
  type StoredDocumentPublicShare,
} from '../../../server/modules/documents/document-public-shares'
import { DOCUMENT_PUBLIC_SHARE_SCOPE } from '../../../shared/documents/public-share-constants'

const projectId = '00000000-0000-4000-8000-000000000411'
const rootDocumentId = '00000000-0000-4000-8000-000000000412'
const actorUserId = '00000000-0000-4000-8000-000000000413'
const shareId = '00000000-0000-4000-8000-000000000414'
const replacementShareId = '00000000-0000-4000-8000-000000000415'
const token = 'A'.repeat(43)
const now = new Date('2026-08-02T12:00:00.000Z')

const stored: StoredDocumentPublicShare = {
  id: shareId,
  projectId,
  rootDocumentId,
  scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
  tokenHash: 'a'.repeat(64),
  tokenCiphertext: 'ciphertext',
  tokenNonce: 'nonce',
  tokenKeyVersion: 1,
  createdByUserId: actorUserId,
  revokedByUserId: null,
  createdAt: now,
  revokedAt: null,
  updatedAt: now,
}

const repository = (): DocumentPublicShareRepository => ({
  listManaged: vi.fn().mockResolvedValue([]),
  createManaged: vi.fn().mockResolvedValue(stored),
  loadManaged: vi.fn().mockResolvedValue(stored),
  rotateManaged: vi.fn().mockResolvedValue(stored),
  revokeManaged: vi.fn().mockResolvedValue({
    ...stored,
    revokedByUserId: actorUserId,
    revokedAt: now,
  }),
})

const service = (
  repo = repository(),
  createId: () => string = () => shareId,
) => createDocumentPublicShareManagementService({
  repository: repo,
  crypto: {
    randomToken: vi.fn().mockReturnValue(token),
    encrypt: vi.fn().mockReturnValue({ ciphertext: 'ciphertext', nonce: 'nonce', keyVersion: 1 }),
    decrypt: vi.fn().mockReturnValue(token),
  },
  createId,
  now: () => now,
  publicBaseUrl: 'https://minerva.example/',
})

describe('public document share management service', () => {
  it('creates an encrypted capability and returns a strict safe projection plus copyable URL', async () => {
    const repo = repository()
    const result = await service(repo).open({
      projectId,
      rootDocumentId,
      actorUserId,
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
    })
    expect(result).toEqual({
      ok: true,
      value: {
        share: {
          id: shareId,
          rootDocumentId,
          scope: DOCUMENT_PUBLIC_SHARE_SCOPE.DOCUMENT,
          status: 'active',
          createdAt: now.toISOString(),
          revokedAt: null,
        },
        url: `https://minerva.example/share/documentation/${token}`,
      },
    })
    expect(repo.createManaged).toHaveBeenCalledWith(expect.objectContaining({
      id: shareId,
      tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/u),
      tokenCiphertext: 'ciphertext',
    }))
    expect(JSON.stringify(vi.mocked(repo.createManaged).mock.calls)).not.toContain(token)
  })

  it('decrypts an existing active link only after the repository authorizes the management read', async () => {
    const repo = repository()
    await expect(service(repo).copy({ projectId, rootDocumentId, actorUserId, shareId }))
      .resolves.toMatchObject({ ok: true, value: { url: expect.stringContaining(token) } })
    expect(repo.loadManaged).toHaveBeenCalledWith({ projectId, rootDocumentId, actorUserId, shareId })
  })

  it('delegates atomic rotation and returns the newly persisted capability', async () => {
    const repo = repository()
    await expect(service(repo, () => replacementShareId).rotate({ projectId, rootDocumentId, actorUserId, shareId }))
      .resolves.toMatchObject({ ok: true, value: { share: { status: 'active' } } })
    expect(repo.rotateManaged).toHaveBeenCalledWith(expect.objectContaining({
      previousShareId: shareId,
      replacement: expect.objectContaining({ id: replacementShareId, tokenHash: expect.any(String) }),
    }))
  })

  it('returns a content-free revoked projection and rejects copying a revoked link', async () => {
    const repo = repository()
    const api = service(repo)
    await expect(api.revoke({ projectId, rootDocumentId, actorUserId, shareId }))
      .resolves.toMatchObject({ ok: true, value: { status: 'revoked', revokedAt: now.toISOString() } })
    vi.mocked(repo.loadManaged).mockResolvedValueOnce({ ...stored, revokedByUserId: actorUserId, revokedAt: now })
    await expect(api.copy({ projectId, rootDocumentId, actorUserId, shareId }))
      .resolves.toEqual({ ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.INVALID_TRANSITION })
  })

  it('fails closed when current authorization/root/publication checks return no record', async () => {
    const repo = repository()
    vi.mocked(repo.createManaged).mockResolvedValueOnce(null)
    await expect(service(repo).open({
      projectId,
      rootDocumentId,
      actorUserId,
      scope: DOCUMENT_PUBLIC_SHARE_SCOPE.BRANCH,
    })).resolves.toEqual({ ok: false, code: DOCUMENT_PUBLIC_SHARE_ERROR.NOT_FOUND })
  })
})
