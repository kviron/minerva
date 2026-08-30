import { and, eq, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { AI_TURN_OUTCOME } from '../../../shared/ai-assistant/constants'
import { AUDIT_CHANNEL, AUDIT_OUTCOME } from '../../../shared/projects/constants'
import {
  projectAiTurnControls,
  projectAiUsageEvents,
} from '../../infrastructure/database/schema/ai-assistant'
import { auditEvents } from '../../infrastructure/database/schema/projects'
import type {
  AssistantTurnBeginCommand,
  AssistantTurnFinishCommand,
  AssistantTurnPersistenceBegin,
} from './assistant-turn-lifecycle'

type AiDatabase = PostgresJsDatabase

const controlScopeKey = (command: AssistantTurnBeginCommand): string =>
  `${command.projectId}\u001f${command.actorUserId}`

const millisecondsUntil = (later: Date, now: Date): number =>
  Math.max(1, later.getTime() - now.getTime())

const auditAction = (outcome: AssistantTurnFinishCommand['outcome']): string =>
  `project_ai.turn_${outcome}`

export const createAssistantTurnPersistence = (db: AiDatabase) => Object.freeze({
  begin(command: AssistantTurnBeginCommand): Promise<AssistantTurnPersistenceBegin> {
    return db.transaction(async (tx): Promise<AssistantTurnPersistenceBegin> => {
      await tx.execute(sql`
        select pg_advisory_xact_lock(hashtextextended(${controlScopeKey(command)}, 0))
      `)

      const [current] = await tx.select({
        rateWindowStartedAt: projectAiTurnControls.rateWindowStartedAt,
        rateCount: projectAiTurnControls.rateCount,
        leaseExpiresAt: projectAiTurnControls.leaseExpiresAt,
      })
        .from(projectAiTurnControls)
        .where(and(
          eq(projectAiTurnControls.projectId, command.projectId),
          eq(projectAiTurnControls.userId, command.actorUserId),
        ))
        .for('update')
        .limit(1)

      if (current?.leaseExpiresAt !== null && current?.leaseExpiresAt !== undefined) {
        if (current.leaseExpiresAt.getTime() > command.startedAt.getTime()) {
          return {
            type: 'concurrent',
            retryAfterMs: millisecondsUntil(current.leaseExpiresAt, command.startedAt),
          }
        }
      }

      const windowMs = command.rateWindowSeconds * 1_000
      const windowEndsAt = current === undefined
        ? command.startedAt
        : new Date(current.rateWindowStartedAt.getTime() + windowMs)
      const windowIsActive = current !== undefined
        && windowEndsAt.getTime() > command.startedAt.getTime()
      if (windowIsActive && current.rateCount >= command.maxRequests) {
        return {
          type: 'rate_limited',
          retryAfterMs: millisecondsUntil(windowEndsAt, command.startedAt),
        }
      }

      const nextRateWindowStartedAt = windowIsActive
        ? current.rateWindowStartedAt
        : command.startedAt
      const nextRateCount = windowIsActive ? current.rateCount + 1 : 1
      if (current === undefined) {
        await tx.insert(projectAiTurnControls).values({
          projectId: command.projectId,
          userId: command.actorUserId,
          rateWindowStartedAt: nextRateWindowStartedAt,
          rateCount: nextRateCount,
          leaseToken: command.leaseToken,
          leaseExpiresAt: command.leaseExpiresAt,
          updatedAt: command.startedAt,
        })
      }
      else {
        await tx.update(projectAiTurnControls).set({
          rateWindowStartedAt: nextRateWindowStartedAt,
          rateCount: nextRateCount,
          leaseToken: command.leaseToken,
          leaseExpiresAt: command.leaseExpiresAt,
          updatedAt: command.startedAt,
        }).where(and(
          eq(projectAiTurnControls.projectId, command.projectId),
          eq(projectAiTurnControls.userId, command.actorUserId),
        ))
      }
      return { type: 'acquired' }
    })
  },

  finish(command: AssistantTurnFinishCommand): Promise<void> {
    return db.transaction(async (tx): Promise<void> => {
      const [released] = await tx.update(projectAiTurnControls).set({
        leaseToken: null,
        leaseExpiresAt: null,
        updatedAt: command.finishedAt,
      }).where(and(
        eq(projectAiTurnControls.projectId, command.projectId),
        eq(projectAiTurnControls.userId, command.actorUserId),
        eq(projectAiTurnControls.leaseToken, command.leaseToken),
      )).returning({ id: projectAiTurnControls.id })

      if (released === undefined) return

      await tx.insert(projectAiUsageEvents).values({
        projectId: command.projectId,
        userId: command.actorUserId,
        connectionId: command.connectionId,
        requestId: command.requestId,
        provider: command.provider,
        model: command.model,
        inputTokens: command.inputTokens,
        outputTokens: command.outputTokens,
        durationMs: command.durationMs,
        outcome: command.outcome,
        errorCode: command.errorCode,
        createdAt: command.finishedAt,
      }).onConflictDoNothing({ target: projectAiUsageEvents.requestId })

      await tx.insert(auditEvents).values({
        actorUserId: command.actorUserId,
        channel: AUDIT_CHANNEL.WEB,
        action: auditAction(command.outcome),
        outcome: command.outcome === AI_TURN_OUTCOME.COMPLETED
          ? AUDIT_OUTCOME.SUCCEEDED
          : AUDIT_OUTCOME.FAILED,
        projectId: command.projectId,
        targetType: 'project_ai_turn',
        targetId: command.requestId,
        metadata: {
          provider: command.provider,
          model: command.model,
          inputTokens: command.inputTokens,
          outputTokens: command.outputTokens,
          durationMs: command.durationMs,
          outcome: command.outcome,
          errorCode: command.errorCode,
          toolNames: command.toolNames,
          documentIds: command.documentIds,
        },
        createdAt: command.finishedAt,
      })
    })
  },
})
