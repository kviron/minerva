import { randomUUID } from 'node:crypto'
import type {
  ProjectAiAvailabilityResponse,
  ProjectAiConnection,
  ProjectAiConnectionDisconnectResponse,
  ProjectAiConnectionResponse,
  ProjectAiConnectionTestResponse,
  ProjectAiConnectionUpsertRequest,
} from '../../../shared/ai-assistant/contracts'
import {
  AI_ASSISTANT_AVAILABILITY,
  AI_CONNECTION_STATUS,
  type AI_PROVIDER,
} from '../../../shared/ai-assistant/constants'
import { AUDIT_CHANNEL, PROJECT_PERMISSION } from '../../../shared/projects/constants'
import type { AuditChannel } from '../../../shared/projects/types'
import type { ProjectAiSecretEnvelope } from './crypto'
import type {
  ProjectAssistantAccessDecision,
  ProjectAssistantAuthorizationInput,
} from './authorize-project-assistant'

export const PROJECT_AI_CONNECTION_ERROR = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  CONNECTION_UNAVAILABLE: 'CONNECTION_UNAVAILABLE',
} as const

type ProjectAiConnectionError = typeof PROJECT_AI_CONNECTION_ERROR[keyof typeof PROJECT_AI_CONNECTION_ERROR]
type Result<Value> =
  | { readonly ok: true, readonly value: Value }
  | { readonly ok: false, readonly code: ProjectAiConnectionError }

export interface StoredProjectAiConnection {
  readonly id: string
  readonly projectId: string
  readonly provider: typeof AI_PROVIDER[keyof typeof AI_PROVIDER]
  readonly model: string
  readonly apiKeyCiphertext: string
  readonly apiKeyNonce: string
  readonly apiKeyKeyVersion: number
  readonly enabled: boolean
  readonly status: typeof AI_CONNECTION_STATUS[keyof typeof AI_CONNECTION_STATUS]
  readonly systemInstructions: string | null
  readonly maxOutputTokens: number
  readonly requestTimeoutMs: number
  readonly lastValidatedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface SaveProjectAiConnectionCommand extends ProjectAiSecretEnvelope {
  readonly connectionId: string
  readonly projectId: string
  readonly actorUserId: string
  readonly channel: AuditChannel
  readonly provider: StoredProjectAiConnection['provider']
  readonly model: string
  readonly enabled: boolean
  readonly systemInstructions: string | null
  readonly maxOutputTokens: number
  readonly requestTimeoutMs: number
}

export interface MarkProjectAiValidationCommand {
  readonly connectionId: string
  readonly projectId: string
  readonly actorUserId: string
  readonly channel: AuditChannel
  readonly status: typeof AI_CONNECTION_STATUS.VALID | typeof AI_CONNECTION_STATUS.INVALID
}

export interface DisconnectProjectAiConnectionCommand {
  readonly projectId: string
  readonly actorUserId: string
  readonly channel: AuditChannel
}

export interface ProjectAiConnectionRepository {
  readonly load: (projectId: string) => Promise<StoredProjectAiConnection | null>
  readonly save: (command: SaveProjectAiConnectionCommand) => Promise<StoredProjectAiConnection>
  readonly markValidation: (command: MarkProjectAiValidationCommand) => Promise<StoredProjectAiConnection>
  readonly disconnect: (command: DisconnectProjectAiConnectionCommand) => Promise<void>
}

interface ProjectAiConnectionCrypto {
  readonly encrypt: (
    plaintext: string,
    context: Readonly<{ projectId: string, connectionId: string }>,
  ) => ProjectAiSecretEnvelope
  readonly decrypt: (
    envelope: ProjectAiSecretEnvelope,
    context: Readonly<{ projectId: string, connectionId: string }>,
  ) => string
}

export interface TestProjectAiProviderInput {
  readonly provider: StoredProjectAiConnection['provider']
  readonly model: string
  readonly apiKey: string
  readonly timeoutMs: number
}

interface ProjectAiConnectionServiceDependencies {
  readonly authorize: (input: ProjectAssistantAuthorizationInput) => Promise<ProjectAssistantAccessDecision>
  readonly repository: ProjectAiConnectionRepository
  readonly crypto: ProjectAiConnectionCrypto
  readonly testProvider: (input: TestProjectAiProviderInput) => Promise<Readonly<{ reachable: boolean }>>
  readonly createId?: () => string
}

interface ProjectAiConnectionActorInput {
  readonly projectId: string
  readonly actorUserId: string
  readonly channel?: AuditChannel
}

interface SaveProjectAiConnectionInput extends ProjectAiConnectionActorInput {
  readonly input: ProjectAiConnectionUpsertRequest
}

const toProjection = (record: StoredProjectAiConnection): ProjectAiConnection => ({
  id: record.id,
  provider: record.provider,
  model: record.model,
  enabled: record.enabled,
  status: record.status,
  systemInstructions: record.systemInstructions,
  maxOutputTokens: record.maxOutputTokens,
  requestTimeoutMs: record.requestTimeoutMs,
  lastValidatedAt: record.lastValidatedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

const authorizeManage = async (
  authorize: ProjectAiConnectionServiceDependencies['authorize'],
  input: ProjectAiConnectionActorInput,
): Promise<Result<true>> => {
  const decision = await authorize({
    projectId: input.projectId,
    userId: input.actorUserId,
    permission: PROJECT_PERMISSION.PROJECT_AI_MANAGE,
  })
  return decision.allowed
    ? { ok: true, value: true }
    : { ok: false, code: PROJECT_AI_CONNECTION_ERROR.PERMISSION_DENIED }
}

const authorizeUse = async (
  authorize: ProjectAiConnectionServiceDependencies['authorize'],
  input: ProjectAiConnectionActorInput,
): Promise<Result<true>> => {
  const decision = await authorize({
    projectId: input.projectId,
    userId: input.actorUserId,
    permission: PROJECT_PERMISSION.PROJECT_AI_USE,
  })
  return decision.allowed
    ? { ok: true, value: true }
    : { ok: false, code: PROJECT_AI_CONNECTION_ERROR.PERMISSION_DENIED }
}

export const projectAiAvailability = (
  connection: StoredProjectAiConnection | null,
): ProjectAiAvailabilityResponse => {
  if (connection === null) {
    return { availability: AI_ASSISTANT_AVAILABILITY.NOT_CONFIGURED }
  }
  if (!connection.enabled) {
    return { availability: AI_ASSISTANT_AVAILABILITY.DISABLED }
  }
  if (connection.status !== AI_CONNECTION_STATUS.VALID) {
    return { availability: AI_ASSISTANT_AVAILABILITY.NEEDS_VALIDATION }
  }
  return { availability: AI_ASSISTANT_AVAILABILITY.READY }
}

export const createProjectAiConnectionService = (dependencies: ProjectAiConnectionServiceDependencies) => {
  const createId = dependencies.createId ?? randomUUID

  return Object.freeze({
    async readAvailability(
      input: ProjectAiConnectionActorInput,
    ): Promise<Result<ProjectAiAvailabilityResponse>> {
      const access = await authorizeUse(dependencies.authorize, input)
      if (!access.ok) return access
      const connection = await dependencies.repository.load(input.projectId)
      return { ok: true, value: projectAiAvailability(connection) }
    },

    async read(input: ProjectAiConnectionActorInput): Promise<Result<ProjectAiConnectionResponse>> {
      const access = await authorizeManage(dependencies.authorize, input)
      if (!access.ok) return access
      const connection = await dependencies.repository.load(input.projectId)
      return { ok: true, value: { connection: connection === null ? null : toProjection(connection) } }
    },

    async save(input: SaveProjectAiConnectionInput): Promise<Result<ProjectAiConnection>> {
      const access = await authorizeManage(dependencies.authorize, input)
      if (!access.ok) return access
      const connectionId = createId()
      const envelope = dependencies.crypto.encrypt(input.input.apiKey, {
        projectId: input.projectId,
        connectionId,
      })
      const systemInstructions = input.input.systemInstructions?.trim() || null
      const record = await dependencies.repository.save({
        connectionId,
        projectId: input.projectId,
        actorUserId: input.actorUserId,
        channel: input.channel ?? AUDIT_CHANNEL.WEB,
        provider: input.input.provider,
        model: input.input.model.trim(),
        enabled: input.input.enabled,
        systemInstructions,
        maxOutputTokens: input.input.maxOutputTokens,
        requestTimeoutMs: input.input.requestTimeoutMs,
        ...envelope,
      })
      return { ok: true, value: toProjection(record) }
    },

    async test(input: ProjectAiConnectionActorInput): Promise<Result<ProjectAiConnectionTestResponse>> {
      const access = await authorizeManage(dependencies.authorize, input)
      if (!access.ok) return access
      const record = await dependencies.repository.load(input.projectId)
      if (record === null) return { ok: false, code: PROJECT_AI_CONNECTION_ERROR.NOT_CONFIGURED }

      let apiKey: string
      try {
        apiKey = dependencies.crypto.decrypt({
          ciphertext: record.apiKeyCiphertext,
          nonce: record.apiKeyNonce,
          keyVersion: record.apiKeyKeyVersion,
        }, { projectId: record.projectId, connectionId: record.id })
      }
      catch {
        return { ok: false, code: PROJECT_AI_CONNECTION_ERROR.CONNECTION_UNAVAILABLE }
      }

      const test = await dependencies.testProvider({
        provider: record.provider,
        model: record.model,
        apiKey,
        timeoutMs: record.requestTimeoutMs,
      })
      const updated = await dependencies.repository.markValidation({
        connectionId: record.id,
        projectId: record.projectId,
        actorUserId: input.actorUserId,
        channel: input.channel ?? AUDIT_CHANNEL.WEB,
        status: test.reachable ? AI_CONNECTION_STATUS.VALID : AI_CONNECTION_STATUS.INVALID,
      })
      return { ok: true, value: { connection: toProjection(updated), reachable: test.reachable } }
    },

    async disconnect(input: ProjectAiConnectionActorInput): Promise<Result<ProjectAiConnectionDisconnectResponse>> {
      const access = await authorizeManage(dependencies.authorize, input)
      if (!access.ok) return access
      await dependencies.repository.disconnect({
        projectId: input.projectId,
        actorUserId: input.actorUserId,
        channel: input.channel ?? AUDIT_CHANNEL.WEB,
      })
      return { ok: true, value: { disconnected: true } }
    },
  })
}
