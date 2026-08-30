import { randomUUID } from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { OAUTH_GRANT_STATUS } from '../../../shared/identity/constants'
import { mcpIdempotencyRecords, oauthGrants } from '../../infrastructure/database/schema'
import {
  type IdempotencyCoordinatorDependencies,
  type IdempotencyPersistenceBegin,
  type McpJsonValue,
} from './idempotency-coordinator'
import { decideIdempotencyBegin, IDEMPOTENCY_DECISION, IDEMPOTENCY_STATUS } from './idempotency-state'

type McpDatabase = PostgresJsDatabase

interface IdempotencyPersistenceOptions {
  readonly db: McpDatabase
  readonly now?: () => Date
  readonly createLeaseToken?: () => string
  readonly leaseDurationMs?: number
  readonly retentionDurationMs?: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const TOOL_PATTERN = /^[a-z0-9_]{1,128}$/u
const HASH_PATTERN = /^[a-f0-9]{64}$/u

const validateCommand = (command: Parameters<IdempotencyCoordinatorDependencies['begin']>[0]): void => {
  if (
    !UUID_PATTERN.test(command.grantId)
    || !UUID_PATTERN.test(command.projectId)
    || !TOOL_PATTERN.test(command.toolName)
    || command.idempotencyKey.trim() !== command.idempotencyKey
    || command.idempotencyKey.length < 1
    || command.idempotencyKey.length > 128
    || !HASH_PATTERN.test(command.requestHash)
  ) {
    throw new TypeError('Invalid idempotency command')
  }
}

const isMcpJsonValue = (value: unknown): value is McpJsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(isMcpJsonValue)
  return typeof value === 'object' && Object.values(value).every(isMcpJsonValue)
}

const storedSafeResult = (value: unknown): McpJsonValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('value' in value)) {
    throw new Error('Invalid stored idempotency result')
  }
  const result = value.value
  if (!isMcpJsonValue(result)) throw new Error('Invalid stored idempotency result')
  return result
}

const scopeKey = (command: Parameters<IdempotencyCoordinatorDependencies['begin']>[0]): string =>
  [command.grantId, command.toolName, command.projectId, command.idempotencyKey].join('\u001f')

export function createMcpIdempotencyPersistence(
  options: IdempotencyPersistenceOptions,
): IdempotencyCoordinatorDependencies {
  const now = options.now ?? (() => new Date())
  const createLeaseToken = options.createLeaseToken ?? randomUUID
  const leaseDurationMs = options.leaseDurationMs ?? 30_000
  const retentionDurationMs = options.retentionDurationMs ?? 86_400_000
  if (
    !Number.isSafeInteger(leaseDurationMs)
    || leaseDurationMs < 1
    || !Number.isSafeInteger(retentionDurationMs)
    || retentionDurationMs <= leaseDurationMs
    || retentionDurationMs > 7 * 86_400_000
  ) {
    throw new TypeError('Invalid idempotency durations')
  }

  return {
    begin(command): Promise<IdempotencyPersistenceBegin> {
      validateCommand(command)
      return options.db.transaction(async (tx): Promise<IdempotencyPersistenceBegin> => {
        const currentTime = now()
        await tx.execute(sql`
          with expired as (
            select id from mcp_idempotency_records
            where retention_expires_at <= ${currentTime.toISOString()}::timestamptz
            order by retention_expires_at
            for update skip locked
            limit 100
          )
          delete from mcp_idempotency_records
          where id in (select id from expired)
        `)
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scopeKey(command)}, 0))`)

        const [grant] = await tx.select({ status: oauthGrants.status })
          .from(oauthGrants)
          .where(eq(oauthGrants.id, command.grantId))
          .for('share')
          .limit(1)
        if (grant?.status !== OAUTH_GRANT_STATUS.ACTIVE) return { type: 'grant_inactive' }

        const scope = and(
          eq(mcpIdempotencyRecords.grantId, command.grantId),
          eq(mcpIdempotencyRecords.toolName, command.toolName),
          eq(mcpIdempotencyRecords.projectId, command.projectId),
          eq(mcpIdempotencyRecords.idempotencyKey, command.idempotencyKey),
        )
        const [existing] = await tx.select({
          requestHash: mcpIdempotencyRecords.requestHash,
          status: mcpIdempotencyRecords.status,
          leaseExpiresAt: mcpIdempotencyRecords.leaseExpiresAt,
          safeResult: mcpIdempotencyRecords.safeResult,
          retentionExpiresAt: mcpIdempotencyRecords.retentionExpiresAt,
        }).from(mcpIdempotencyRecords).where(scope).for('update').limit(1)
        const decision = decideIdempotencyBegin(existing ?? null, command.requestHash, currentTime)

        if (decision.type === IDEMPOTENCY_DECISION.CONFLICT) return { type: 'conflict' }
        if (decision.type === IDEMPOTENCY_DECISION.BUSY) {
          return { type: 'busy', retryAfterMs: decision.retryAfterMs }
        }
        if (decision.type === IDEMPOTENCY_DECISION.REPLAY) {
          return { type: 'replay', safeResult: storedSafeResult(decision.safeResult) }
        }

        const leaseToken = createLeaseToken()
        if (!UUID_PATTERN.test(leaseToken)) throw new TypeError('Invalid idempotency lease token')
        const leaseExpiresAt = new Date(currentTime.getTime() + leaseDurationMs)
        const retentionExpiresAt = new Date(currentTime.getTime() + retentionDurationMs)
        if (existing) {
          await tx.update(mcpIdempotencyRecords).set({
            requestHash: command.requestHash,
            status: IDEMPOTENCY_STATUS.IN_PROGRESS,
            leaseToken,
            leaseExpiresAt,
            safeResult: null,
            createdAt: currentTime,
            updatedAt: currentTime,
            retentionExpiresAt,
          }).where(scope)
        }
        else {
          await tx.insert(mcpIdempotencyRecords).values({
            grantId: command.grantId,
            toolName: command.toolName,
            projectId: command.projectId,
            idempotencyKey: command.idempotencyKey,
            requestHash: command.requestHash,
            status: IDEMPOTENCY_STATUS.IN_PROGRESS,
            leaseToken,
            leaseExpiresAt,
            createdAt: currentTime,
            updatedAt: currentTime,
            retentionExpiresAt,
          })
        }
        return { type: 'execute', leaseToken }
      })
    },

    complete(command, safeResult): Promise<boolean> {
      validateCommand(command)
      if (!UUID_PATTERN.test(command.leaseToken) || !isMcpJsonValue(safeResult)) {
        throw new TypeError('Invalid idempotency completion')
      }
      return options.db.transaction(async (tx): Promise<boolean> => {
        const currentTime = now()
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scopeKey(command)}, 0))`)
        const [grant] = await tx.select({ status: oauthGrants.status })
          .from(oauthGrants)
          .where(eq(oauthGrants.id, command.grantId))
          .for('share')
          .limit(1)
        if (grant?.status !== OAUTH_GRANT_STATUS.ACTIVE) return false

        const [completed] = await tx.update(mcpIdempotencyRecords).set({
          status: IDEMPOTENCY_STATUS.COMPLETED,
          leaseToken: null,
          leaseExpiresAt: null,
          safeResult: { value: safeResult },
          updatedAt: currentTime,
        }).where(and(
          eq(mcpIdempotencyRecords.grantId, command.grantId),
          eq(mcpIdempotencyRecords.toolName, command.toolName),
          eq(mcpIdempotencyRecords.projectId, command.projectId),
          eq(mcpIdempotencyRecords.idempotencyKey, command.idempotencyKey),
          eq(mcpIdempotencyRecords.requestHash, command.requestHash),
          eq(mcpIdempotencyRecords.status, IDEMPOTENCY_STATUS.IN_PROGRESS),
          eq(mcpIdempotencyRecords.leaseToken, command.leaseToken),
          gt(mcpIdempotencyRecords.leaseExpiresAt, currentTime),
        )).returning({ id: mcpIdempotencyRecords.id })
        return completed !== undefined
      })
    },
  }
}
