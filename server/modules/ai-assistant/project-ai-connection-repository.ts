import { and, eq, sql } from 'drizzle-orm'
import { AI_CONNECTION_STATUS } from '../../../shared/ai-assistant/constants'
import { AUDIT_OUTCOME } from '../../../shared/projects/constants'
import { getDatabase } from '../../infrastructure/database/client'
import { projectAiConnections } from '../../infrastructure/database/schema/ai-assistant'
import { auditEvents } from '../../infrastructure/database/schema/projects'
import type {
  DisconnectProjectAiConnectionCommand,
  MarkProjectAiValidationCommand,
  ProjectAiConnectionRepository,
  SaveProjectAiConnectionCommand,
  StoredProjectAiConnection,
} from './project-ai-connections'

type ProjectDatabase = ReturnType<typeof getDatabase>['db']

const connectionSelection = {
  id: projectAiConnections.id,
  projectId: projectAiConnections.projectId,
  provider: projectAiConnections.provider,
  model: projectAiConnections.model,
  apiKeyCiphertext: projectAiConnections.apiKeyCiphertext,
  apiKeyNonce: projectAiConnections.apiKeyNonce,
  apiKeyKeyVersion: projectAiConnections.apiKeyKeyVersion,
  enabled: projectAiConnections.enabled,
  status: projectAiConnections.status,
  systemInstructions: projectAiConnections.systemInstructions,
  maxOutputTokens: projectAiConnections.maxOutputTokens,
  requestTimeoutMs: projectAiConnections.requestTimeoutMs,
  lastValidatedAt: projectAiConnections.lastValidatedAt,
  createdAt: projectAiConnections.createdAt,
  updatedAt: projectAiConnections.updatedAt,
}

const requiredRecord = (record: StoredProjectAiConnection | undefined): StoredProjectAiConnection => {
  if (!record) throw new Error('Project AI connection persistence failed')
  return record
}

export const createProjectAiConnectionRepository = (db: ProjectDatabase): ProjectAiConnectionRepository => ({
  async load(projectId) {
    const [record] = await db.select(connectionSelection)
      .from(projectAiConnections)
      .where(eq(projectAiConnections.projectId, projectId))
      .limit(1)
    return record ?? null
  },

  async save(command: SaveProjectAiConnectionCommand) {
    return db.transaction(async (tx) => {
      const values = {
        id: command.connectionId,
        projectId: command.projectId,
        provider: command.provider,
        model: command.model,
        apiKeyCiphertext: command.ciphertext,
        apiKeyNonce: command.nonce,
        apiKeyKeyVersion: command.keyVersion,
        enabled: command.enabled,
        status: AI_CONNECTION_STATUS.UNVERIFIED,
        systemInstructions: command.systemInstructions,
        maxOutputTokens: command.maxOutputTokens,
        requestTimeoutMs: command.requestTimeoutMs,
        lastValidatedAt: null,
        createdByUserId: command.actorUserId,
        updatedByUserId: command.actorUserId,
      }
      const [record] = await tx.insert(projectAiConnections)
        .values(values)
        .onConflictDoUpdate({
          target: projectAiConnections.projectId,
          set: {
            id: command.connectionId,
            provider: command.provider,
            model: command.model,
            apiKeyCiphertext: command.ciphertext,
            apiKeyNonce: command.nonce,
            apiKeyKeyVersion: command.keyVersion,
            enabled: command.enabled,
            status: AI_CONNECTION_STATUS.UNVERIFIED,
            systemInstructions: command.systemInstructions,
            maxOutputTokens: command.maxOutputTokens,
            requestTimeoutMs: command.requestTimeoutMs,
            lastValidatedAt: null,
            createdByUserId: command.actorUserId,
            updatedByUserId: command.actorUserId,
            createdAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        })
        .returning(connectionSelection)

      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: command.channel,
        action: 'project_ai.connection_saved',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: command.projectId,
        targetType: 'project_ai_connection',
        targetId: command.connectionId,
        metadata: {
          provider: command.provider,
          model: command.model,
          enabled: command.enabled,
          maxOutputTokens: command.maxOutputTokens,
          requestTimeoutMs: command.requestTimeoutMs,
        },
      })
      return requiredRecord(record)
    })
  },

  async markValidation(command: MarkProjectAiValidationCommand) {
    return db.transaction(async (tx) => {
      const [record] = await tx.update(projectAiConnections)
        .set({
          status: command.status,
          lastValidatedAt: sql`now()`,
          updatedByUserId: command.actorUserId,
          updatedAt: sql`now()`,
        })
        .where(and(
          eq(projectAiConnections.id, command.connectionId),
          eq(projectAiConnections.projectId, command.projectId),
        ))
        .returning(connectionSelection)

      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: command.channel,
        action: 'project_ai.connection_tested',
        outcome: command.status === AI_CONNECTION_STATUS.VALID
          ? AUDIT_OUTCOME.SUCCEEDED
          : AUDIT_OUTCOME.FAILED,
        projectId: command.projectId,
        targetType: 'project_ai_connection',
        targetId: command.connectionId,
        metadata: { status: command.status },
      })
      return requiredRecord(record)
    })
  },

  async disconnect(command: DisconnectProjectAiConnectionCommand) {
    await db.transaction(async (tx) => {
      const [record] = await tx.delete(projectAiConnections)
        .where(eq(projectAiConnections.projectId, command.projectId))
        .returning({ id: projectAiConnections.id, provider: projectAiConnections.provider })
      if (!record) return

      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: command.channel,
        action: 'project_ai.connection_disconnected',
        outcome: AUDIT_OUTCOME.SUCCEEDED,
        projectId: command.projectId,
        targetType: 'project_ai_connection',
        targetId: record.id,
        metadata: { provider: record.provider },
      })
    })
  },
})
