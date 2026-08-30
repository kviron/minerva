import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestDatabase, resetTestDatabase, TEST_DATABASE_URL } from '../../helpers/database'

vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)

const userId = '00000000-0000-4000-8000-000000000041'
const sessionId = '00000000-0000-4000-8000-000000000042'
const grantId = '00000000-0000-4000-8000-000000000043'
const refreshId = '00000000-0000-4000-8000-000000000044'
const clientId = 'mcp-contract-client'
const resource = 'https://minerva.example/mcp'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${userId}, 'OAuth User', 'oauth-user@example.com', true, 'active')
    `
    await database.queryClient`
      insert into "session" (id, expires_at, token, user_id, updated_at)
      values (${sessionId}, now() + interval '1 hour', 'hashed-session-token', ${userId}, now())
    `
    await database.queryClient`
      insert into oauth_client (client_id, redirect_uris, token_endpoint_auth_method)
      values (${clientId}, array['https://client.example/callback'], 'none')
    `
  } finally {
    await database.close()
  }
})

describe('OAuth grants persistence', () => {
  it('keeps one active grant per user, client, and canonical resource', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`
        insert into oauth_grants (id, user_id, client_id, resource, scopes)
        values (${grantId}, ${userId}, ${clientId}, ${resource}, array['documents:read'])
      `

      await expect(database.queryClient`
        insert into oauth_grants (user_id, client_id, resource, scopes)
        values (${userId}, ${clientId}, ${resource}, array['documents:read'])
      `).rejects.toThrow()

      await database.queryClient`
        update oauth_grants
        set status = 'revoked', revoked_at = now(), updated_at = now()
        where id = ${grantId}
      `
      await expect(database.queryClient`
        insert into oauth_grants (user_id, client_id, resource, scopes)
        values (${userId}, ${clientId}, ${resource}, array['documents:read'])
      `).resolves.toBeDefined()
    } finally {
      await database.close()
    }
  })

  it('rejects inconsistent revocation state', async () => {
    const database = createTestDatabase()
    try {
      await expect(database.queryClient`
        insert into oauth_grants (user_id, client_id, resource, scopes, status)
        values (${userId}, ${clientId}, ${resource}, array['documents:read'], 'revoked')
      `).rejects.toThrow()
      await expect(database.queryClient`
        insert into oauth_grants (user_id, client_id, resource, scopes, status, revoked_at)
        values (${userId}, ${clientId}, ${resource}, array['documents:read'], 'active', now())
      `).rejects.toThrow()
    } finally {
      await database.close()
    }
  })

  it('preserves the grant reference across consent and a refresh-token family', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`
        insert into oauth_grants (id, user_id, client_id, resource, scopes)
        values (${grantId}, ${userId}, ${clientId}, ${resource}, array['documents:read', 'offline_access'])
      `
      await database.queryClient`
        insert into oauth_consent (client_id, user_id, reference_id, scopes)
        values (${clientId}, ${userId}, ${grantId}, array['documents:read', 'offline_access'])
      `
      await database.queryClient`
        insert into oauth_refresh_token
          (id, token, client_id, session_id, user_id, reference_id, expires_at, scopes)
        values
          (${refreshId}, 'hashed-refresh-token', ${clientId}, ${sessionId}, ${userId}, ${grantId}, now() + interval '1 hour', array['documents:read', 'offline_access'])
      `
      await database.queryClient`
        insert into oauth_access_token
          (token, client_id, session_id, user_id, reference_id, refresh_id, expires_at, scopes)
        values
          ('hashed-access-token', ${clientId}, ${sessionId}, ${userId}, ${grantId}, ${refreshId}, now() + interval '5 minutes', array['documents:read'])
      `

      const references = await database.queryClient<{ source: string, referenceId: string | null }[]>`
        select 'consent' as source, reference_id as "referenceId" from oauth_consent
        union all
        select 'refresh', reference_id from oauth_refresh_token
        union all
        select 'access', reference_id from oauth_access_token
        order by source
      `
      expect(references).toEqual([
        { source: 'access', referenceId: grantId },
        { source: 'consent', referenceId: grantId },
        { source: 'refresh', referenceId: grantId },
      ])

      await database.queryClient`delete from oauth_refresh_token where id = ${refreshId}`
      const accessRows = await database.queryClient`select id from oauth_access_token`
      expect(accessRows).toEqual([])
    } finally {
      await database.close()
    }
  })
})
