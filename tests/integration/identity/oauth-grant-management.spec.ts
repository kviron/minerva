import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { beforeEach, describe, expect, it } from 'vitest'
import { ACCOUNT_STATUS } from '../../../shared/identity/constants'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import {
  createOAuthGrantManagement,
  OAUTH_GRANT_REVOCATION_RESULT,
} from '../../../server/modules/identity/oauth-grants'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const userId = '00000000-0000-4000-8000-000000000051'
const otherUserId = '00000000-0000-4000-8000-000000000052'
const grantId = '00000000-0000-4000-8000-000000000053'
const clientId = 'grant-management-client'

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`
      insert into "user" (id, name, email, email_verified, status) values
      (${userId}, 'Grant Owner', 'grant-owner@example.com', true, 'active'),
      (${otherUserId}, 'Other User', 'other-user@example.com', true, 'active')
    `
    await database.queryClient`
      insert into oauth_client (client_id, name, redirect_uris, token_endpoint_auth_method)
      values (${clientId}, 'Desktop AI', array['https://client.example/callback'], 'none')
    `
    await database.queryClient`
      insert into oauth_grants (id, user_id, client_id, resource, scopes)
      values (${grantId}, ${userId}, ${clientId}, 'https://minerva.example/mcp', array['documents:read'])
    `
    await database.queryClient`
      insert into oauth_consent (client_id, user_id, reference_id, scopes)
      values (${clientId}, ${userId}, ${grantId}, array['documents:read'])
    `
    await database.queryClient`
      insert into oauth_refresh_token
        (token, client_id, user_id, reference_id, expires_at, scopes)
      values ('hashed-refresh', ${clientId}, ${userId}, ${grantId}, now() + interval '1 hour', array['documents:read'])
    `
    await database.queryClient`
      insert into oauth_access_token
        (token, client_id, user_id, reference_id, expires_at, scopes)
      values ('hashed-access', ${clientId}, ${userId}, ${grantId}, now() + interval '1 hour', array['documents:read'])
    `
  } finally {
    await database.close()
  }
})

describe('OAuth grant management', () => {
  it('rejects token issuance after revocation commits', async () => {
    const database = createTestDatabase()
    try {
      const management = createOAuthGrantManagement(database.db)
      const [grant] = await management.listActive(userId)
      if (!grant) throw new Error('Expected active grant fixture')
      await management.revoke({ actorUserId: userId, grantId, expectedUpdatedAt: grant.updatedAt, channel: AUDIT_CHANNEL.WEB })

      await expect(database.queryClient`
        insert into oauth_refresh_token
          (token, client_id, user_id, reference_id, expires_at, scopes)
        values ('late-refresh', ${clientId}, ${userId}, ${grantId}, now() + interval '1 hour', array['documents:read'])
      `).rejects.toThrow()
    } finally {
      await database.close()
    }
  })

  it('serializes in-flight token issuance before revocation and removes the issued token', async () => {
    const issuer = createTestDatabase()
    const revoker = createTestDatabase()
    let releaseIssuance: (() => void) | undefined
    const holdIssuance = new Promise<void>((resolve) => { releaseIssuance = resolve })
    let markInserted: (() => void) | undefined
    const tokenInserted = new Promise<void>((resolve) => { markInserted = resolve })

    try {
      const issuance = issuer.queryClient.begin(async (sql) => {
        await sql`
          insert into oauth_refresh_token
            (token, client_id, user_id, reference_id, expires_at, scopes)
          values ('racing-refresh', ${clientId}, ${userId}, ${grantId}, now() + interval '1 hour', array['documents:read'])
        `
        markInserted?.()
        await holdIssuance
      })
      await tokenInserted

      const management = createOAuthGrantManagement(revoker.db)
      const [grant] = await management.listActive(userId)
      if (!grant) throw new Error('Expected active grant fixture')
      const revocation = management.revoke({ actorUserId: userId, grantId, expectedUpdatedAt: grant.updatedAt, channel: AUDIT_CHANNEL.WEB })
      await new Promise(resolve => setTimeout(resolve, 50))
      releaseIssuance?.()
      await issuance
      await expect(revocation).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.REVOKED })

      const [tokens] = await revoker.queryClient<{ count: number }[]>`
        select count(*)::int as count from oauth_refresh_token where reference_id = ${grantId}
      `
      expect(tokens?.count).toBe(0)
    } finally {
      releaseIssuance?.()
      await Promise.all([issuer.close(), revoker.close()])
    }
  }, 10_000)

  it('reuses one active grant reference during concurrent consent processing', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`delete from oauth_consent`
      await database.queryClient`delete from oauth_access_token`
      await database.queryClient`delete from oauth_refresh_token`
      await database.queryClient`delete from oauth_grants`
      const management = createOAuthGrantManagement(database.db)
      const command = {
        actorUserId: userId,
        clientId,
        resource: 'https://minerva.example/mcp',
        scopes: ['documents:read'] as const,
      }

      const references = await Promise.all([
        management.ensureActive(command),
        management.ensureActive(command),
      ])

      expect(references[0]).toBe(references[1])
      await expect(management.listActive(userId)).resolves.toEqual([])
      const [count] = await database.queryClient<{ count: number }[]>`
        select count(*)::int as count from oauth_grants where status = 'active'
      `
      expect(count?.count).toBe(1)
    } finally {
      await database.close()
    }
  })

  it('lists only the owner active grants with a safe client projection', async () => {
    const database = createTestDatabase()
    try {
      const management = createOAuthGrantManagement(database.db)
      await expect(management.listActive(userId)).resolves.toEqual([
        expect.objectContaining({
          id: grantId,
          client: { id: clientId, name: 'Desktop AI' },
          resource: 'https://minerva.example/mcp',
          scopes: ['documents:read'],
        }),
      ])
    } finally {
      await database.close()
    }
  })

  it('atomically revokes the owned grant, token family, consent, and records a content-free audit', async () => {
    const database = createTestDatabase()
    try {
      const management = createOAuthGrantManagement(database.db)
      const [grant] = await management.listActive(userId)
      if (!grant) throw new Error('Expected active grant fixture')

      await expect(management.revoke({
        actorUserId: userId,
        grantId,
        expectedUpdatedAt: grant.updatedAt,
        channel: AUDIT_CHANNEL.WEB,
      })).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.REVOKED })

      const [state] = await database.queryClient<{
        status: string
        consentCount: number
        refreshCount: number
        accessCount: number
      }[]>`
        select g.status,
          (select count(*)::int from oauth_consent where reference_id = ${grantId}) as "consentCount",
          (select count(*)::int from oauth_refresh_token where reference_id = ${grantId}) as "refreshCount",
          (select count(*)::int from oauth_access_token where reference_id = ${grantId}) as "accessCount"
        from oauth_grants g where g.id = ${grantId}
      `
      expect(state).toEqual({ status: 'revoked', consentCount: 0, refreshCount: 0, accessCount: 0 })

      const audits = await database.queryClient`
        select actor_user_id, action, target_type, target_id, metadata
        from audit_events where target_id = ${grantId}
      `
      expect(audits).toEqual([expect.objectContaining({
        actor_user_id: userId,
        action: 'oauth.grant_revoked',
        target_type: 'oauth_grant',
        target_id: grantId,
        metadata: {},
      })])
    } finally {
      await database.close()
    }
  })

  it('does not reveal or revoke another user grant', async () => {
    const database = createTestDatabase()
    try {
      const management = createOAuthGrantManagement(database.db)
      await expect(management.listActive(otherUserId)).resolves.toEqual([])
      await expect(management.revoke({
        actorUserId: otherUserId,
        grantId,
        expectedUpdatedAt: new Date(0).toISOString(),
        channel: AUDIT_CHANNEL.WEB,
      })).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.NOT_FOUND })
    } finally {
      await database.close()
    }
  })

  it('rejects stale and repeated revocation without duplicating the audit', async () => {
    const database = createTestDatabase()
    try {
      const management = createOAuthGrantManagement(database.db)
      const [grant] = await management.listActive(userId)
      if (!grant) throw new Error('Expected active grant fixture')

      await expect(management.revoke({
        actorUserId: userId,
        grantId,
        expectedUpdatedAt: new Date(0).toISOString(),
        channel: AUDIT_CHANNEL.WEB,
      })).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.STALE })
      await management.revoke({ actorUserId: userId, grantId, expectedUpdatedAt: grant.updatedAt, channel: AUDIT_CHANNEL.WEB })
      await expect(management.revoke({
        actorUserId: userId,
        grantId,
        expectedUpdatedAt: grant.updatedAt,
        channel: AUDIT_CHANNEL.WEB,
      })).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.ALREADY_REVOKED })

      const [audit] = await database.queryClient<{ count: number }[]>`
        select count(*)::int as count from audit_events where target_id = ${grantId}
      `
      expect(audit?.count).toBe(1)
    } finally {
      await database.close()
    }
  })

  it('refuses revocation actions from a disabled account', async () => {
    const database = createTestDatabase()
    try {
      await database.queryClient`update "user" set status = ${ACCOUNT_STATUS.DISABLED} where id = ${userId}`
      const management = createOAuthGrantManagement(database.db)
      const [grant] = await management.listActive(userId)
      if (!grant) throw new Error('Expected active grant fixture')

      await expect(management.revoke({
        actorUserId: userId,
        grantId,
        expectedUpdatedAt: grant.updatedAt,
        channel: AUDIT_CHANNEL.WEB,
      })).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.ACCOUNT_INACTIVE })
    } finally {
      await database.close()
    }
  })
})
