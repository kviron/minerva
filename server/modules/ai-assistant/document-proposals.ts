import { createHash, randomUUID } from 'node:crypto'
import type {
  ProjectAiDocumentProposalProjection,
} from '../../../shared/ai-assistant/contracts'
import {
  AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES,
  AI_DOCUMENT_PROPOSAL_KIND,
  AI_DOCUMENT_PROPOSAL_STATUS,
  AI_DOCUMENT_PROPOSAL_TRANSITION,
} from '../../../shared/ai-assistant/constants'
import type { DocumentContent } from '../../../shared/documents/contracts'
import { PROJECT_PERMISSION } from '../../../shared/projects/constants'
import { parseDocumentContent } from '../documents/content-schema'
import type {
  ProjectAssistantAccessDecision,
  ProjectAssistantAuthorizationInput,
} from './authorize-project-assistant'
import {
  pendingProposalExpiresAt,
  transitionDocumentProposal,
} from './document-proposal-lifecycle'

type ProposalKind =
  typeof AI_DOCUMENT_PROPOSAL_KIND[keyof typeof AI_DOCUMENT_PROPOSAL_KIND]
type ProposalStatus =
  typeof AI_DOCUMENT_PROPOSAL_STATUS[keyof typeof AI_DOCUMENT_PROPOSAL_STATUS]

export const PROJECT_AI_DOCUMENT_PROPOSAL_ERROR = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  TURN_CONFLICT: 'TURN_CONFLICT',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
} as const

type ProposalError =
  typeof PROJECT_AI_DOCUMENT_PROPOSAL_ERROR[keyof typeof PROJECT_AI_DOCUMENT_PROPOSAL_ERROR]
type Result<Value> =
  | Readonly<{ ok: true, value: Value }>
  | Readonly<{ ok: false, code: ProposalError }>

export interface StoredProjectAiDocumentProposal {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly conversationId: string
  readonly turnRequestId: string
  readonly kind: ProposalKind
  readonly status: ProposalStatus
  readonly targetDocumentId: string | null
  readonly requestedParentId: string | null
  readonly expectedDraftRevision: number | null
  readonly baseTitle: string | null
  readonly baseContent: DocumentContent | null
  readonly proposedTitle: string | null
  readonly proposedContent: DocumentContent | null
  readonly contentHash: string | null
  readonly appliedDocumentId: string | null
  readonly appliedDraftRevision: number | null
  readonly expiresAt: Date
  readonly decidedAt: Date | null
  readonly purgeAfter: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface CreateProjectAiDocumentProposalCommand {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly conversationId: string
  readonly turnRequestId: string
  readonly kind: ProposalKind
  readonly targetDocumentId: string | null
  readonly requestedParentId: string | null
  readonly expectedDraftRevision: number | null
  readonly baseTitle: string | null
  readonly baseContent: DocumentContent | null
  readonly proposedTitle: string
  readonly proposedContent: DocumentContent
  readonly contentHash: string
  readonly expiresAt: Date
  readonly now: Date
}

export interface TerminalizeProjectAiDocumentProposalCommand {
  readonly projectId: string
  readonly userId: string
  readonly proposalId: string
  readonly status: Exclude<ProposalStatus, typeof AI_DOCUMENT_PROPOSAL_STATUS.PENDING>
  readonly decidedAt: Date
  readonly purgeAfter: Date
  readonly appliedDocumentId: string | null
  readonly appliedDraftRevision: number | null
  readonly clearPayload: true
}

interface CleanupCommand {
  readonly now: Date
  readonly limit: number
}

export interface ProjectAiDocumentProposalRepository {
  readonly create: (
    command: CreateProjectAiDocumentProposalCommand,
  ) => Promise<StoredProjectAiDocumentProposal | null>
  readonly loadOwned: (query: Readonly<{
    projectId: string
    userId: string
    proposalId: string
  }>) => Promise<StoredProjectAiDocumentProposal | null>
  readonly terminalizeOwned: (
    command: TerminalizeProjectAiDocumentProposalCommand,
  ) => Promise<StoredProjectAiDocumentProposal | null>
  readonly expirePending: (command: CleanupCommand) => Promise<number>
  readonly purgeReceipts: (command: CleanupCommand) => Promise<number>
}

type CommonCreateInput = Readonly<{
  projectId: string
  actorUserId: string
  conversationId: string
  turnRequestId: string
  proposedTitle: string
  proposedContent: unknown
}>

type CreateProposalInput = CommonCreateInput & Readonly<{
  kind: typeof AI_DOCUMENT_PROPOSAL_KIND.CREATE
  parentId: string | null
}>

type UpdateProposalInput = CommonCreateInput & Readonly<{
  kind: typeof AI_DOCUMENT_PROPOSAL_KIND.UPDATE
  documentId: string
  expectedDraftRevision: number
  baseTitle: string
  baseContent: unknown
}>

interface Dependencies {
  readonly authorize: (
    input: ProjectAssistantAuthorizationInput,
  ) => Promise<ProjectAssistantAccessDecision>
  readonly repository: ProjectAiDocumentProposalRepository
  readonly createId?: () => string
  readonly now?: () => Date
}

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Proposal content must contain finite numbers')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (typeof value !== 'object') throw new TypeError('Proposal content must be JSON-safe')
  const entries = Object.entries(value).toSorted(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`
}

const contentBytes = (content: DocumentContent): number =>
  new TextEncoder().encode(JSON.stringify(content)).byteLength

const projection = (
  record: StoredProjectAiDocumentProposal,
): ProjectAiDocumentProposalProjection => ({
  id: record.id,
  kind: record.kind,
  status: record.status,
  targetDocumentId: record.targetDocumentId,
  proposedTitle: record.proposedTitle,
  expiresAt: record.expiresAt.toISOString(),
  appliedDocumentId: record.appliedDocumentId,
  appliedDraftRevision: record.appliedDraftRevision,
})

const validTitle = (value: string): string | null => {
  const title = value.trim()
  return title.length >= 1 && title.length <= 200 ? title : null
}

const authorizeProposal = async (
  authorize: Dependencies['authorize'],
  projectId: string,
  userId: string,
): Promise<boolean> => {
  for (const permission of [
    PROJECT_PERMISSION.PROJECT_AI_USE,
    PROJECT_PERMISSION.DOCUMENTS_VIEW,
  ]) {
    const decision = await authorize({ projectId, userId, permission })
    if (!decision.allowed) return false
  }
  return true
}

export const createProjectAiDocumentProposalService = (dependencies: Dependencies) => {
  const createId = dependencies.createId ?? randomUUID
  const currentTime = dependencies.now ?? (() => new Date())

  const access = (projectId: string, actorUserId: string) =>
    authorizeProposal(dependencies.authorize, projectId, actorUserId)

  const terminalize = async (
    record: StoredProjectAiDocumentProposal,
    command: Readonly<{ type: 'reject' | 'expire', now: Date }>,
  ): Promise<Result<ProjectAiDocumentProposalProjection>> => {
    const transition = transitionDocumentProposal(record, command)
    if (transition.type !== AI_DOCUMENT_PROPOSAL_TRANSITION.TRANSITION) {
      return {
        ok: false,
        code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.INVALID_TRANSITION,
      }
    }
    const updated = await dependencies.repository.terminalizeOwned({
      projectId: record.projectId,
      userId: record.userId,
      proposalId: record.id,
      ...transition.terminal,
    })
    if (updated !== null) return { ok: true, value: projection(updated) }
    const current = await dependencies.repository.loadOwned({
      projectId: record.projectId,
      userId: record.userId,
      proposalId: record.id,
    })
    return current === null
      ? { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND }
      : { ok: true, value: projection(current) }
  }

  return Object.freeze({
    async create(
      input: CreateProposalInput | UpdateProposalInput,
    ): Promise<Result<ProjectAiDocumentProposalProjection>> {
      if (!await access(input.projectId, input.actorUserId)) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.PERMISSION_DENIED }
      }
      const proposedTitle = validTitle(input.proposedTitle)
      const proposedContent = parseDocumentContent(input.proposedContent)
      const baseTitle = input.kind === AI_DOCUMENT_PROPOSAL_KIND.UPDATE
        ? validTitle(input.baseTitle)
        : null
      const baseContent = input.kind === AI_DOCUMENT_PROPOSAL_KIND.UPDATE
        ? parseDocumentContent(input.baseContent)
        : null
      if (
        proposedTitle === null
        || proposedContent === null
        || (input.kind === AI_DOCUMENT_PROPOSAL_KIND.UPDATE && (
          baseTitle === null
          || baseContent === null
          || !Number.isInteger(input.expectedDraftRevision)
          || input.expectedDraftRevision < 0
        ))
      ) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.INVALID_INPUT }
      }
      if (
        contentBytes(proposedContent) > AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES
        || (baseContent !== null
          && contentBytes(baseContent) > AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES)
      ) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.CONTENT_TOO_LARGE }
      }

      const now = currentTime()
      const normalized = {
        kind: input.kind,
        targetDocumentId: input.kind === AI_DOCUMENT_PROPOSAL_KIND.UPDATE
          ? input.documentId
          : null,
        requestedParentId: input.kind === AI_DOCUMENT_PROPOSAL_KIND.CREATE
          ? input.parentId
          : null,
        expectedDraftRevision: input.kind === AI_DOCUMENT_PROPOSAL_KIND.UPDATE
          ? input.expectedDraftRevision
          : null,
        baseTitle,
        baseContent,
        proposedTitle,
        proposedContent,
      }
      const contentHash = createHash('sha256')
        .update(canonicalJson(normalized))
        .digest('hex')
      const record = await dependencies.repository.create({
        id: createId(),
        projectId: input.projectId,
        userId: input.actorUserId,
        conversationId: input.conversationId,
        turnRequestId: input.turnRequestId,
        ...normalized,
        contentHash,
        expiresAt: pendingProposalExpiresAt(now),
        now,
      })
      if (record === null) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND }
      }
      if (record.contentHash !== contentHash) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.TURN_CONFLICT }
      }
      return { ok: true, value: projection(record) }
    },

    async read(input: Readonly<{
      projectId: string
      actorUserId: string
      proposalId: string
    }>): Promise<Result<ProjectAiDocumentProposalProjection>> {
      if (!await access(input.projectId, input.actorUserId)) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.PERMISSION_DENIED }
      }
      const record = await dependencies.repository.loadOwned({
        projectId: input.projectId,
        userId: input.actorUserId,
        proposalId: input.proposalId,
      })
      if (record === null) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND }
      }
      const now = currentTime()
      return record.status === AI_DOCUMENT_PROPOSAL_STATUS.PENDING
        && now.getTime() >= record.expiresAt.getTime()
        ? terminalize(record, { type: 'expire', now })
        : { ok: true, value: projection(record) }
    },

    async reject(input: Readonly<{
      projectId: string
      actorUserId: string
      proposalId: string
    }>): Promise<Result<ProjectAiDocumentProposalProjection>> {
      if (!await access(input.projectId, input.actorUserId)) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.PERMISSION_DENIED }
      }
      const record = await dependencies.repository.loadOwned({
        projectId: input.projectId,
        userId: input.actorUserId,
        proposalId: input.proposalId,
      })
      if (record === null) {
        return { ok: false, code: PROJECT_AI_DOCUMENT_PROPOSAL_ERROR.NOT_FOUND }
      }
      return terminalize(record, { type: 'reject', now: currentTime() })
    },
  })
}
