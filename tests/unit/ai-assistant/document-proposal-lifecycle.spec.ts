import { describe, expect, it } from 'vitest'
import {
  AI_DOCUMENT_PROPOSAL_STATUS,
  AI_DOCUMENT_PROPOSAL_TRANSITION,
} from '../../../shared/ai-assistant/constants'
import {
  pendingProposalExpiresAt,
  proposalReceiptPurgeAt,
  transitionDocumentProposal,
} from '../../../server/modules/ai-assistant/document-proposal-lifecycle'

const now = new Date('2026-07-31T12:00:00.000Z')
const pending = {
  status: AI_DOCUMENT_PROPOSAL_STATUS.PENDING,
  expiresAt: pendingProposalExpiresAt(now),
  appliedDocumentId: null,
  appliedDraftRevision: null,
}

describe('AI document proposal lifecycle', () => {
  it('uses a fifteen-minute pending window and at most a twenty-four-hour receipt', () => {
    expect(pending.expiresAt.toISOString()).toBe('2026-07-31T12:15:00.000Z')
    expect(proposalReceiptPurgeAt(now).toISOString()).toBe('2026-08-01T12:00:00.000Z')
  })

  it.each([
    ['reject', AI_DOCUMENT_PROPOSAL_STATUS.REJECTED],
    ['stale', AI_DOCUMENT_PROPOSAL_STATUS.STALE],
  ] as const)('clears payload for a %s transition', (type, status) => {
    expect(transitionDocumentProposal(pending, { type, now })).toEqual({
      type: AI_DOCUMENT_PROPOSAL_TRANSITION.TRANSITION,
      terminal: {
        status,
        decidedAt: now,
        purgeAfter: proposalReceiptPurgeAt(now),
        appliedDocumentId: null,
        appliedDraftRevision: null,
        clearPayload: true,
      },
    })
  })

  it('expires an overdue proposal before another requested decision', () => {
    const late = new Date('2026-07-31T12:15:00.000Z')
    expect(transitionDocumentProposal(pending, {
      type: 'apply',
      now: late,
      documentId: '00000000-0000-4000-8000-000000000303',
      draftRevision: 4,
    })).toMatchObject({
      type: AI_DOCUMENT_PROPOSAL_TRANSITION.TRANSITION,
      terminal: { status: AI_DOCUMENT_PROPOSAL_STATUS.EXPIRED, clearPayload: true },
    })
  })

  it('applies once and replays only the content-free applied receipt', () => {
    const command = {
      type: 'apply' as const,
      now,
      documentId: '00000000-0000-4000-8000-000000000303',
      draftRevision: 4,
    }
    const first = transitionDocumentProposal(pending, command)
    expect(first).toMatchObject({
      type: AI_DOCUMENT_PROPOSAL_TRANSITION.TRANSITION,
      terminal: {
        status: AI_DOCUMENT_PROPOSAL_STATUS.APPLIED,
        appliedDocumentId: command.documentId,
        appliedDraftRevision: 4,
        clearPayload: true,
      },
    })
    expect(transitionDocumentProposal({
      status: AI_DOCUMENT_PROPOSAL_STATUS.APPLIED,
      expiresAt: pending.expiresAt,
      appliedDocumentId: command.documentId,
      appliedDraftRevision: 4,
    }, command)).toEqual({
      type: AI_DOCUMENT_PROPOSAL_TRANSITION.REPLAY,
      receipt: { documentId: command.documentId, draftRevision: 4 },
    })
  })

  it('rejects invalid terminal transitions and premature explicit expiry', () => {
    expect(transitionDocumentProposal(pending, { type: 'expire', now }))
      .toEqual({ type: AI_DOCUMENT_PROPOSAL_TRANSITION.INVALID, code: 'not_expired' })
    expect(transitionDocumentProposal({
      ...pending,
      status: AI_DOCUMENT_PROPOSAL_STATUS.REJECTED,
    }, { type: 'reject', now }))
      .toEqual({ type: AI_DOCUMENT_PROPOSAL_TRANSITION.INVALID, code: 'not_pending' })
  })
})
