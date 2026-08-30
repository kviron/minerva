import {
  AI_DOCUMENT_PROPOSAL_PENDING_MINUTES,
  AI_DOCUMENT_PROPOSAL_RECEIPT_HOURS,
  AI_DOCUMENT_PROPOSAL_STATUS,
  AI_DOCUMENT_PROPOSAL_TRANSITION,
} from '../../../shared/ai-assistant/constants'

type ProposalStatus =
  typeof AI_DOCUMENT_PROPOSAL_STATUS[keyof typeof AI_DOCUMENT_PROPOSAL_STATUS]

export interface ProposalLifecycleState {
  readonly status: ProposalStatus
  readonly expiresAt: Date
  readonly appliedDocumentId: string | null
  readonly appliedDraftRevision: number | null
}

type ProposalLifecycleCommand =
  | Readonly<{ type: 'reject' | 'expire' | 'stale', now: Date }>
  | Readonly<{
    type: 'apply'
    now: Date
    documentId: string
    draftRevision: number
  }>

export interface ProposalTerminalState {
  readonly status: Exclude<ProposalStatus, typeof AI_DOCUMENT_PROPOSAL_STATUS.PENDING>
  readonly decidedAt: Date
  readonly purgeAfter: Date
  readonly appliedDocumentId: string | null
  readonly appliedDraftRevision: number | null
  readonly clearPayload: true
}

export type ProposalTransitionResult =
  | Readonly<{
    type: typeof AI_DOCUMENT_PROPOSAL_TRANSITION.TRANSITION
    terminal: ProposalTerminalState
  }>
  | Readonly<{
    type: typeof AI_DOCUMENT_PROPOSAL_TRANSITION.REPLAY
    receipt: Readonly<{ documentId: string, draftRevision: number }>
  }>
  | Readonly<{
    type: typeof AI_DOCUMENT_PROPOSAL_TRANSITION.INVALID
    code: 'not_pending' | 'not_expired'
  }>

const addTime = (value: Date, milliseconds: number): Date =>
  new Date(value.getTime() + milliseconds)

export const pendingProposalExpiresAt = (createdAt: Date): Date =>
  addTime(createdAt, AI_DOCUMENT_PROPOSAL_PENDING_MINUTES * 60 * 1_000)

export const proposalReceiptPurgeAt = (decidedAt: Date): Date =>
  addTime(decidedAt, AI_DOCUMENT_PROPOSAL_RECEIPT_HOURS * 60 * 60 * 1_000)

const terminal = (
  status: ProposalTerminalState['status'],
  now: Date,
  appliedDocumentId: string | null = null,
  appliedDraftRevision: number | null = null,
): ProposalTransitionResult => ({
  type: AI_DOCUMENT_PROPOSAL_TRANSITION.TRANSITION,
  terminal: {
    status,
    decidedAt: now,
    purgeAfter: proposalReceiptPurgeAt(now),
    appliedDocumentId,
    appliedDraftRevision,
    clearPayload: true,
  },
})

export const transitionDocumentProposal = (
  state: ProposalLifecycleState,
  command: ProposalLifecycleCommand,
): ProposalTransitionResult => {
  if (state.status === AI_DOCUMENT_PROPOSAL_STATUS.APPLIED && command.type === 'apply') {
    return state.appliedDocumentId !== null && state.appliedDraftRevision !== null
      ? {
          type: AI_DOCUMENT_PROPOSAL_TRANSITION.REPLAY,
          receipt: {
            documentId: state.appliedDocumentId,
            draftRevision: state.appliedDraftRevision,
          },
        }
      : { type: AI_DOCUMENT_PROPOSAL_TRANSITION.INVALID, code: 'not_pending' }
  }
  if (state.status !== AI_DOCUMENT_PROPOSAL_STATUS.PENDING) {
    return { type: AI_DOCUMENT_PROPOSAL_TRANSITION.INVALID, code: 'not_pending' }
  }
  if (command.now.getTime() >= state.expiresAt.getTime()) {
    return terminal(AI_DOCUMENT_PROPOSAL_STATUS.EXPIRED, command.now)
  }
  if (command.type === 'expire') {
    return { type: AI_DOCUMENT_PROPOSAL_TRANSITION.INVALID, code: 'not_expired' }
  }
  if (command.type === 'reject') {
    return terminal(AI_DOCUMENT_PROPOSAL_STATUS.REJECTED, command.now)
  }
  if (command.type === 'stale') {
    return terminal(AI_DOCUMENT_PROPOSAL_STATUS.STALE, command.now)
  }
  return terminal(
    AI_DOCUMENT_PROPOSAL_STATUS.APPLIED,
    command.now,
    command.documentId,
    command.draftRevision,
  )
}
