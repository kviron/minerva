import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createMcpIdempotencyCoordinator, IDEMPOTENCY_RUN_RESULT } from '../../../server/modules/mcp/idempotency-coordinator'
import { createMcpIdempotencyPersistence } from '../../../server/modules/mcp/idempotency-persistence'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const userId = '00000000-0000-4000-8000-000000000081'
const grantId = '00000000-0000-4000-8000-000000000082'
const secondGrantId = '00000000-0000-4000-8000-000000000083'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${userId}, 'Idempotency User', 'idempotency@example.com', true, 'active')
    `
    await database.queryClient`
      insert into oauth_client (client_id, name, redirect_uris, token_endpoint_auth_method) values
      ('idempotency-client-1', 'Client 1', array['https://client.example/one'], 'none'),
      ('idempotency-client-2', 'Client 2', array['https://client.example/two'], 'none')
    `
    await database.queryClient`
      insert into oauth_grants (id, user_id, client_id, resource, scopes) values
      (${grantId}, ${userId}, 'idempotency-client-1', 'https://minerva.example/mcp', array['documents:write']),
      (${secondGrantId}, ${userId}, 'idempotency-client-2', 'https://minerva.example/mcp', array['documents:write'])
    `
  } finally {
    await database.close()
  }
})

describe('MCP idempotency persistence', () => {
  it('executes one concurrent request, replays it, and rejects a changed payload', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({
        actorUserId: userId,
        channel: AUDIT_CHANNEL.MCP,
        name: 'Idempotency project',
        description: null,
      })
      const persistence = createMcpIdempotencyPersistence({
        db: database.db,
        now: () => new Date('2026-07-15T10:00:00.000Z'),
        createLeaseToken: vi.fn()
          .mockReturnValueOnce('00000000-0000-4000-8000-000000000091'),
      })
      const run = createMcpIdempotencyCoordinator(persistence)
      const command = {
        grantId,
        toolName: 'minerva_document_create',
        projectId: project.projectId,
        idempotencyKey: 'create-home',
        requestHash: 'a'.repeat(64),
      }
      let releaseOperation: (() => void) | undefined
      let markStarted: (() => void) | undefined
      const started = new Promise<void>((resolve) => { markStarted = resolve })
      const hold = new Promise<void>((resolve) => { releaseOperation = resolve })
      const operation = vi.fn(async () => {
        markStarted?.()
        await hold
        return { documentId: '00000000-0000-4000-8000-000000000092' }
      })

      const first = run(command, operation)
      await started
      await expect(run(command, operation)).resolves.toMatchObject({ type: IDEMPOTENCY_RUN_RESULT.BUSY })
      releaseOperation?.()
      await expect(first).resolves.toMatchObject({ type: IDEMPOTENCY_RUN_RESULT.EXECUTED })
      await expect(run(command, operation)).resolves.toEqual({
        type: IDEMPOTENCY_RUN_RESULT.REPLAYED,
        safeResult: { documentId: '00000000-0000-4000-8000-000000000092' },
      })
      await expect(run({ ...command, requestHash: 'b'.repeat(64) }, operation))
        .resolves.toEqual({ type: IDEMPOTENCY_RUN_RESULT.CONFLICT })
      expect(operation).toHaveBeenCalledOnce()
    } finally {
      await database.close()
    }
  })

  it('isolates the same key across grants and projects', async () => {
    const database = createTestDatabase()
    try {
      const firstProject = await createProjectPersistence(database.db)({ actorUserId: userId, channel: AUDIT_CHANNEL.MCP, name: 'First', description: null })
      const secondProject = await createProjectPersistence(database.db)({ actorUserId: userId, channel: AUDIT_CHANNEL.MCP, name: 'Second', description: null })
      const persistence = createMcpIdempotencyPersistence({ db: database.db })
      const base = {
        grantId,
        toolName: 'minerva_document_create',
        projectId: firstProject.projectId,
        idempotencyKey: 'same-key',
        requestHash: 'c'.repeat(64),
      }

      await expect(persistence.begin(base)).resolves.toMatchObject({ type: 'execute' })
      await expect(persistence.begin({ ...base, grantId: secondGrantId })).resolves.toMatchObject({ type: 'execute' })
      await expect(persistence.begin({ ...base, projectId: secondProject.projectId })).resolves.toMatchObject({ type: 'execute' })
    } finally {
      await database.close()
    }
  })

  it('reclaims expired leases, rejects stale completion, and refuses revoked grants', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: userId, channel: AUDIT_CHANNEL.MCP, name: 'Lease', description: null })
      let currentTime = new Date('2026-07-15T10:00:00.000Z')
      const persistence = createMcpIdempotencyPersistence({
        db: database.db,
        now: () => currentTime,
        createLeaseToken: vi.fn()
          .mockReturnValueOnce('00000000-0000-4000-8000-000000000093')
          .mockReturnValueOnce('00000000-0000-4000-8000-000000000094')
          .mockReturnValueOnce('00000000-0000-4000-8000-000000000095'),
        leaseDurationMs: 1_000,
      })
      const command = {
        grantId,
        toolName: 'minerva_document_update',
        projectId: project.projectId,
        idempotencyKey: 'lease-test',
        requestHash: 'd'.repeat(64),
      }
      await expect(persistence.begin(command)).resolves.toEqual({
        type: 'execute', leaseToken: '00000000-0000-4000-8000-000000000093',
      })
      currentTime = new Date('2026-07-15T10:00:02.000Z')
      await expect(persistence.begin(command)).resolves.toEqual({
        type: 'execute', leaseToken: '00000000-0000-4000-8000-000000000094',
      })
      await expect(persistence.complete({
        ...command,
        leaseToken: '00000000-0000-4000-8000-000000000093',
      }, { updated: true })).resolves.toBe(false)

      const revokedCommand = { ...command, grantId: secondGrantId, idempotencyKey: 'revoked' }
      await expect(persistence.begin(revokedCommand)).resolves.toEqual({
        type: 'execute', leaseToken: '00000000-0000-4000-8000-000000000095',
      })
      await expect(persistence.complete({
        ...revokedCommand,
        leaseToken: '00000000-0000-4000-8000-000000000095',
      }, { updated: true })).resolves.toBe(true)
      await database.queryClient`
        update oauth_grants set status = 'revoked', revoked_at = now(), updated_at = now() where id = ${secondGrantId}
      `
      await expect(persistence.begin(revokedCommand))
        .resolves.toEqual({ type: 'grant_inactive' })
    } finally {
      await database.close()
    }
  })
})
