import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_PROVIDER } from '../../../shared/ai-assistant/constants'
import { createProjectAiCrypto } from '../../../server/modules/ai-assistant/crypto'
import { createProjectAiConnectionRepository } from '../../../server/modules/ai-assistant/project-ai-connection-repository'
import { createProjectAiConnectionService } from '../../../server/modules/ai-assistant/project-ai-connections'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const USER_ID = '00000000-0000-4000-8000-0000000000a1'
const PROJECT_ID = '00000000-0000-4000-8000-0000000000a2'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${USER_ID}, 'AI Admin', 'ai-admin@example.com', true, 'active')
    `
    await database.queryClient`
      insert into projects (id, name, status, created_by_user_id)
      values (${PROJECT_ID}, 'AI Project', 'active', ${USER_ID})
    `
  } finally {
    await database.close()
  }
})

describe('project AI connections persistence', () => {
  it('stores ciphertext, replaces safely, validates, disconnects, and keeps audit content-free', async () => {
    const database = createTestDatabase()
    let id = 0
    const service = createProjectAiConnectionService({
      authorize: vi.fn().mockResolvedValue({ allowed: true }),
      repository: createProjectAiConnectionRepository(database.db),
      crypto: createProjectAiCrypto({ activeVersion: 1, keys: new Map([[1, Buffer.alloc(32, 5)]]) }),
      testProvider: vi.fn().mockResolvedValue({ reachable: true }),
      createId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    })
    const save = (apiKey: string, model: string) => service.save({
      projectId: PROJECT_ID,
      actorUserId: USER_ID,
      input: {
        provider: AI_PROVIDER.OPENAI,
        model,
        apiKey,
        enabled: true,
        systemInstructions: 'Private project instructions',
        maxOutputTokens: 2048,
        requestTimeoutMs: 30_000,
      },
    })

    try {
      expect((await save('sk-first-private-1234567890', 'gpt-5-mini')).ok).toBe(true)
      const [first] = await database.queryClient<{
        id: string
        api_key_ciphertext: string
        api_key_nonce: string
      }[]>`select id, api_key_ciphertext, api_key_nonce from project_ai_connections where project_id = ${PROJECT_ID}`
      expect(first?.api_key_ciphertext).not.toContain('sk-first-private')
      expect(first?.api_key_nonce).toBeTruthy()

      expect((await save('sk-second-private-1234567890', 'gpt-5')).ok).toBe(true)
      const rows = await database.queryClient<{ id: string, model: string, api_key_ciphertext: string }[]>`
        select id, model, api_key_ciphertext from project_ai_connections where project_id = ${PROJECT_ID}
      `
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ model: 'gpt-5' })
      expect(rows[0]?.id).not.toBe(first?.id)
      expect(rows[0]?.api_key_ciphertext).not.toBe(first?.api_key_ciphertext)

      const tested = await service.test({ projectId: PROJECT_ID, actorUserId: USER_ID })
      expect(tested).toMatchObject({ ok: true, value: { reachable: true, connection: { status: 'valid' } } })

      const audits = await database.queryClient<{ metadata: unknown }[]>`
        select metadata from audit_events where project_id = ${PROJECT_ID} order by created_at
      `
      const auditJson = JSON.stringify(audits)
      expect(auditJson).not.toContain('sk-first-private')
      expect(auditJson).not.toContain('sk-second-private')
      expect(auditJson).not.toContain('Private project instructions')
      expect(auditJson).not.toContain('ciphertext')

      await expect(service.disconnect({ projectId: PROJECT_ID, actorUserId: USER_ID }))
        .resolves.toEqual({ ok: true, value: { disconnected: true } })
      const [{ count }] = await database.queryClient<{ count: number }[]>`
        select count(*)::int as count from project_ai_connections where project_id = ${PROJECT_ID}
      `
      expect(count).toBe(0)
    } finally {
      await database.close()
    }
  })
})
