import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMcpBearerValidator, MCP_BEARER_RESULT } from '../../../server/modules/mcp/bearer-validator'
import { createMcpAuthenticationAudit } from '../../../server/modules/mcp/authentication-audit'
import { createMcpTokenStore } from '../../../server/modules/mcp/token-store'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const userId = '00000000-0000-4000-8000-000000000061'
const grantId = '00000000-0000-4000-8000-000000000062'
const clientId = 'mcp-shell-client'
const rawToken = 'opaque-mcp-token'
const resource = 'https://minerva.example/mcp'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status)
      values (${userId}, 'MCP User', 'mcp-user@example.com', true, 'active')
    `
    await database.queryClient`
      insert into oauth_client (client_id, name, redirect_uris, token_endpoint_auth_method)
      values (${clientId}, 'MCP Shell Client', array['https://client.example/callback'], 'none')
    `
    await database.queryClient`
      insert into oauth_grants (id, user_id, client_id, resource, scopes)
      values (${grantId}, ${userId}, ${clientId}, ${resource}, array['projects:read'])
    `
    await database.queryClient`
      insert into oauth_access_token (token, client_id, user_id, reference_id, expires_at, scopes)
      values (${createHash('sha256').update(rawToken).digest('base64url')}, ${clientId}, ${userId}, ${grantId}, now() + interval '1 hour', array['projects:read'])
    `
  } finally {
    await database.close()
  }
})

describe('MCP bearer persistence', () => {
  it('authenticates an active opaque token without exposing stored token material', async () => {
    const database = createTestDatabase()
    try {
      const validate = createMcpBearerValidator({
        findByTokenHash: createMcpTokenStore(database.db).findByTokenHash,
        now: () => new Date(),
        createRequestId: () => 'request-1',
        issuer: 'https://minerva.example/api/auth',
        resource,
      })
      const result = await validate(rawToken, 'ru')

      expect(result.type).toBe(MCP_BEARER_RESULT.AUTHENTICATED)
      expect(JSON.stringify(result)).not.toContain(rawToken)
    } finally {
      await database.close()
    }
  })

  it('rejects the first validation after grant revocation commits', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`
        update oauth_grants set status = 'revoked', revoked_at = now(), updated_at = now() where id = ${grantId}
      `
      const validate = createMcpBearerValidator({
        findByTokenHash: createMcpTokenStore(database.db).findByTokenHash,
        now: () => new Date(),
        createRequestId: () => 'request-2',
        issuer: 'https://minerva.example/api/auth',
        resource,
      })

      await expect(validate(rawToken, 'en')).resolves.toEqual({
        type: MCP_BEARER_RESULT.UNAUTHENTICATED,
        requestId: 'request-2',
      })
    } finally {
      await database.close()
    }
  })

  it('records a content-free anonymous audit for rejected authentication', async () => {
    const database = createTestDatabase()
    try {
      await createMcpAuthenticationAudit(database.db).recordRejected({ requestId: 'request-rejected-1' })
      const events = await database.queryClient`
        select actor_user_id, channel, action, outcome, target_type, target_id, metadata
        from audit_events where action = 'mcp.authentication_rejected'
      `

      expect(events).toEqual([{
        actor_user_id: null,
        channel: 'mcp',
        action: 'mcp.authentication_rejected',
        outcome: 'failed',
        target_type: 'mcp_authentication',
        target_id: null,
        metadata: { requestId: 'request-rejected-1' },
      }])
      expect(JSON.stringify(events)).not.toContain(rawToken)
      expect(JSON.stringify(events)).not.toContain(grantId)
      expect(JSON.stringify(events)).not.toContain(clientId)
    } finally {
      await database.close()
    }
  })
})
