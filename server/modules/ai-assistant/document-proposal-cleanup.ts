import {
  AI_DOCUMENT_PROPOSAL_CLEANUP_BATCH_MAX,
} from '../../../shared/ai-assistant/constants'
import type { ProjectAiDocumentProposalRepository } from './document-proposals'

type CleanupRepository = Pick<
  ProjectAiDocumentProposalRepository,
  'expirePending' | 'purgeReceipts'
>

export const createProjectAiDocumentProposalCleanup = (
  repository: CleanupRepository,
  now: () => Date = () => new Date(),
) => Object.freeze({
  async run(requestedLimit = 100): Promise<Readonly<{ expired: number, purged: number }>> {
    const limit = Math.max(
      1,
      Math.min(AI_DOCUMENT_PROPOSAL_CLEANUP_BATCH_MAX, Math.trunc(requestedLimit)),
    )
    const current = now()
    const expired = await repository.expirePending({ now: current, limit })
    const purged = await repository.purgeReceipts({ now: current, limit })
    return { expired, purged }
  },
})
