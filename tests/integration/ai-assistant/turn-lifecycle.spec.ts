import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it } from 'vitest'
import { AI_PROVIDER, AI_TURN_OUTCOME } from '../../../shared/ai-assistant/constants'
import { createAssistantTurnPersistence } from '../../../server/modules/ai-assistant/assistant-turn-persistence'
import type {
  AssistantTurnBeginCommand,
  AssistantTurnFinishCommand,
} from '../../../server/modules/ai-assistant/assistant-turn-lifecycle'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const userId = '00000000-0000-4000-8000-0000000000a1'
const projectId = '00000000-0000-4000-8000-0000000000a2'
const connectionId = '00000000-0000-4000-8000-0000000000a3'
const baseTime = new Date('2026-07-29T10:00:00.000Z')

const uuid = (value: number): string =>
  `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`

const beginCommand = (value: number, startedAt = baseTime): AssistantTurnBeginCommand => ({
  projectId,
  actorUserId: userId,
  requestId: uuid(100 + value),
  leaseToken: uuid(200 + value),
  startedAt,
  leaseExpiresAt: new Date(startedAt.getTime() + 45_000),
  maxRequests: 10,
  rateWindowSeconds: 300,
})

const finishCommand = (
  begin: AssistantTurnBeginCommand,
  overrides: Partial<AssistantTurnFinishCommand> = {},
): AssistantTurnFinishCommand => ({
  projectId,
  actorUserId: userId,
  connectionId,
  provider: AI_PROVIDER.OPENAI,
  model: 'gpt-5-mini',
  requestId: begin.requestId,
  leaseToken: begin.leaseToken,
  durationMs: 1_250,
  inputTokens: 80,
  outputTokens: 11,
  outcome: AI_TURN_OUTCOME.COMPLETED,
  errorCode: null,
  toolNames: [],
  documentIds: [],
  finishedAt: new Date(begin.startedAt.getTime() + 1_250),
  ...overrides,
})

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${userId}, 'AI User', 'ai-usage@example.com', true, 'active')
    `
    await database.queryClient`
      insert into projects (id, name, status, created_by_user_id)
      values (${projectId}, 'AI Usage', 'active', ${userId})
    `
    await database.queryClient`
      insert into project_ai_connections (
        id, project_id, provider, model, api_key_ciphertext, api_key_nonce,
        api_key_key_version, status, created_by_user_id, updated_by_user_id
      ) values (
        ${connectionId}, ${projectId}, 'openai', 'gpt-5-mini', 'ciphertext', 'nonce',
        1, 'valid', ${userId}, ${userId}
      )
    `
  }
  finally {
    await database.close()
  }
})

describe('project AI turn persistence', () => {
  it('serializes one active turn and accepts completion only from its lease owner', async () => {
    const database = createTestDatabase()
    const persistence = createAssistantTurnPersistence(database.db)
    const first = beginCommand(1)
    try {
      await expect(persistence.begin(first)).resolves.toEqual({ type: 'acquired' })
      await expect(persistence.begin(beginCommand(2))).resolves.toEqual({
        type: 'concurrent',
        retryAfterMs: 45_000,
      })

      await persistence.finish(finishCommand(first, { leaseToken: uuid(999) }))
      await expect(persistence.begin(beginCommand(3))).resolves.toMatchObject({ type: 'concurrent' })

      await persistence.finish(finishCommand(first, {
        toolNames: ['read_document'],
        documentIds: ['00000000-0000-4000-8000-0000000000b1'],
      }))
      await persistence.finish(finishCommand(first))
      const [counts] = await database.queryClient<{ usage_count: number, audit_count: number }[]>`
        select
          (select count(*)::int from project_ai_usage_events) as usage_count,
          (select count(*)::int from audit_events where target_type = 'project_ai_turn') as audit_count
      `
      expect(counts).toEqual({ usage_count: 1, audit_count: 1 })
      const [audit] = await database.queryClient<{ metadata: unknown }[]>`
        select metadata from audit_events where target_type = 'project_ai_turn' limit 1
      `
      expect(audit?.metadata).toMatchObject({
        toolNames: ['read_document'],
        documentIds: ['00000000-0000-4000-8000-0000000000b1'],
      })
    }
    finally {
      await database.close()
    }
  })

  it('limits starts in a fixed window and stores only content-free usage and audit metadata', async () => {
    const database = createTestDatabase()
    const persistence = createAssistantTurnPersistence(database.db)
    try {
      for (let value = 1; value <= 10; value += 1) {
        const command = beginCommand(value)
        await expect(persistence.begin(command)).resolves.toEqual({ type: 'acquired' })
        await persistence.finish(finishCommand(command))
      }
      await expect(persistence.begin(beginCommand(11))).resolves.toEqual({
        type: 'rate_limited',
        retryAfterMs: 300_000,
      })

      const usage = await database.queryClient<Record<string, unknown>[]>`
        select * from project_ai_usage_events order by created_at limit 1
      `
      const audit = await database.queryClient<{ metadata: unknown }[]>`
        select metadata from audit_events where target_type = 'project_ai_turn' order by created_at limit 1
      `
      const serialized = JSON.stringify({ usage, audit })
      expect(serialized).toContain('gpt-5-mini')
      expect(serialized).not.toMatch(/question|answer|excerpt|api.?key|prompt|completion|document.?text/iu)
    }
    finally {
      await database.close()
    }
  })
})
