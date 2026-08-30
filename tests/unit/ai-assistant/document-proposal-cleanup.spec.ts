import { describe, expect, it, vi } from 'vitest'
import { createProjectAiDocumentProposalCleanup } from '../../../server/modules/ai-assistant/document-proposal-cleanup'

describe('AI document proposal cleanup', () => {
  it('bounds every retry-safe expiry and purge batch', async () => {
    const repository = {
      expirePending: vi.fn().mockResolvedValue(7),
      purgeReceipts: vi.fn().mockResolvedValue(3),
    }
    const now = new Date('2026-07-31T12:00:00.000Z')
    const cleanup = createProjectAiDocumentProposalCleanup(repository, () => now)

    await expect(cleanup.run(10_000)).resolves.toEqual({ expired: 7, purged: 3 })
    expect(repository.expirePending).toHaveBeenCalledWith({ now, limit: 1_000 })
    expect(repository.purgeReceipts).toHaveBeenCalledWith({ now, limit: 1_000 })
  })
})
