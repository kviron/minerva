import { describe, expect, it } from 'vitest'
import {
  projectAiDocumentProposalDecisionRequestSchema,
  projectAiDocumentProposalParamsSchema,
  projectAiDocumentProposalProjectionSchema,
  projectAssistantStreamEventSchema,
} from '../../../shared/ai-assistant/contracts'
import {
  AI_DOCUMENT_PROPOSAL_DECISION,
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
} from '../../../shared/ai-assistant/constants'

const proposalId = '00000000-0000-4000-8000-000000000301'
const projectId = '00000000-0000-4000-8000-000000000302'

describe('AI document proposal contracts', () => {
  it('accepts only closed route, decision, and safe projection fields', () => {
    expect(projectAiDocumentProposalParamsSchema.parse({ id: projectId, proposalId }))
      .toEqual({ id: projectId, proposalId })
    expect(projectAiDocumentProposalDecisionRequestSchema.parse({
      decision: AI_DOCUMENT_PROPOSAL_DECISION.REJECT,
    })).toEqual({ decision: AI_DOCUMENT_PROPOSAL_DECISION.REJECT })

    const projection = {
      id: proposalId,
      kind: AI_DOCUMENT_PROPOSAL_KIND.UPDATE,
      status: AI_DOCUMENT_PROPOSAL_STATUS.PENDING,
      targetDocumentId: '00000000-0000-4000-8000-000000000303',
      proposedTitle: 'Обновлённая страница',
      expiresAt: '2026-07-31T12:15:00.000Z',
      appliedDocumentId: null,
      appliedDraftRevision: null,
    }
    expect(projectAiDocumentProposalProjectionSchema.parse(projection)).toEqual(projection)
    expect(() => projectAiDocumentProposalProjectionSchema.parse({
      ...projection,
      proposedContent: { type: 'doc', content: [] },
    })).toThrow()
  })

  it('permits only a safe proposal projection on stream completion', () => {
    expect(projectAssistantStreamEventSchema.parse({
      type: 'completed',
      citations: [],
      usage: { inputTokens: 1, outputTokens: 1 },
      proposal: {
        id: proposalId,
        kind: AI_DOCUMENT_PROPOSAL_KIND.CREATE,
        status: AI_DOCUMENT_PROPOSAL_STATUS.PENDING,
        targetDocumentId: null,
        proposedTitle: 'Новая страница',
        expiresAt: '2026-07-31T12:15:00.000Z',
        appliedDocumentId: null,
        appliedDraftRevision: null,
      },
    })).toMatchObject({ type: 'completed', proposal: { id: proposalId } })
  })
})
