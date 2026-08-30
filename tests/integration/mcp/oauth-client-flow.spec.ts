import { createHash } from 'node:crypto'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AUTH_MODE } from '../../../shared/identity/constants'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createMinervaAuth } from '../../../server/modules/identity/auth/create-auth'
import { createOAuthAuthorizationServerMetadataHandler } from '../../../server/modules/identity/auth/oauth-metadata'
import { createOAuthGrantManagement, OAUTH_GRANT_REVOCATION_RESULT } from '../../../server/modules/identity/oauth-grants'
import { createMcpBearerValidator, MCP_BEARER_RESULT } from '../../../server/modules/mcp/bearer-validator'
import { createMcpTokenStore } from '../../../server/modules/mcp/token-store'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const baseURL = 'http://127.0.0.1:3000'
const resource = `${baseURL}/mcp`
const redirectUri = 'https://client.example/callback'
const clientId = 'acceptance-mcp-client'
const password = 'Correct-Horse-Battery-1'
const verifier = 'minerva-acceptance-pkce-verifier-012345678901234567890123456789'
const challenge = createHash('sha256').update(verifier).digest('base64url')
const database = createTestDatabase()

beforeAll(async () => {
  await resetTestDatabase()
  await migrate(database.db, { migrationsFolder: 'drizzle' })
  const seedAuth = createMinervaAuth({
    mode: AUTH_MODE.TEST_SEED,
    db: database.db,
    baseURL,
    trustedOrigins: [baseURL],
    mailer: { sendPasswordReset: async () => {} },
  })
  await seedAuth.api.signUpEmail({ body: {
    email: 'acceptance@example.com', username: 'acceptance.user', displayUsername: 'Acceptance User',
    name: 'Acceptance User', password,
  } })
  await database.queryClient`
    insert into oauth_client (
      client_id, name, redirect_uris, token_endpoint_auth_method,
      grant_types, response_types, public, require_pkce
    ) values (
      ${clientId}, 'Acceptance MCP Client', array[${redirectUri}], 'none',
      array['authorization_code', 'refresh_token'], array['code'], true, true
    )
  `
})

afterAll(() => database.close())

describe('real OAuth MCP client flow', () => {
  it('discovers, authorizes with PKCE and exchanges the code for opaque tokens', async () => {
    const auth = createMinervaAuth({
      mode: AUTH_MODE.RUNTIME,
      db: database.db,
      baseURL,
      trustedOrigins: [baseURL],
      mailer: { sendPasswordReset: async () => {} },
      oauth: { resource },
    })
    const metadataResponse = await createOAuthAuthorizationServerMetadataHandler(auth)(
      new Request(`${baseURL}/.well-known/oauth-authorization-server/api/auth`),
    )
    const metadata = await metadataResponse.json() as { authorization_endpoint: string, token_endpoint: string }

    const signedIn = await auth.api.signInEmail({
      body: { email: 'acceptance@example.com', password },
      returnHeaders: true,
    })
    const cookie = signedIn.headers.get('set-cookie')?.split(';', 1)[0]
    expect(cookie).toBeTruthy()

    const authorize = new URL(metadata.authorization_endpoint)
    authorize.search = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'offline_access documents:read documents:write documents:publish',
      resource,
      state: 'acceptance-state',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString()
    const authorization = await auth.handler(new Request(authorize, {
      headers: { cookie: cookie ?? '', accept: 'text/html' },
    }))
    expect(authorization.status).toBe(302)
    const consentLocation = authorization.headers.get('location')
    expect(consentLocation).toContain('/oauth/consent?')
    const consentQuery = consentLocation?.split('?', 2)[1] ?? ''

    const consent = await auth.handler(new Request(`${baseURL}/api/auth/oauth2/consent`, {
      method: 'POST',
      headers: { cookie: cookie ?? '', origin: baseURL, 'content-type': 'application/json' },
      body: JSON.stringify({ accept: true, oauth_query: consentQuery }),
    }))
    const consentResult = await consent.json() as { url: string }
    const callback = new URL(consentResult.url)
    expect(callback.searchParams.get('state')).toBe('acceptance-state')
    const code = callback.searchParams.get('code')
    expect(code).toBeTruthy()

    const token = await auth.handler(new Request(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', client_id: clientId, code: code ?? '',
        redirect_uri: redirectUri, code_verifier: verifier, resource,
      }),
    }))
    const tokens = await token.json() as { access_token?: string, refresh_token?: string, token_type?: string }
    expect(token.status).toBe(200)
    expect(tokens).toMatchObject({ token_type: 'Bearer' })
    expect(tokens.access_token).toBeTruthy()
    expect(tokens.refresh_token).toBeTruthy()
    expect(JSON.stringify(await database.queryClient`select token from oauth_access_token`)).not.toContain(tokens.access_token)

    const refreshed = await auth.handler(new Request(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', client_id: clientId, refresh_token: tokens.refresh_token ?? '',
      }),
    }))
    const rotated = await refreshed.json() as { access_token?: string, refresh_token?: string }
    expect(refreshed.status, JSON.stringify(rotated)).toBe(200)
    expect(rotated.access_token).toBeTruthy()
    expect(rotated.refresh_token).toBeTruthy()
    expect(rotated.access_token).not.toBe(tokens.access_token)

    const validateBearer = createMcpBearerValidator({
      findByTokenHash: createMcpTokenStore(database.db).findByTokenHash,
      now: () => new Date(),
      createRequestId: () => 'acceptance-request',
      issuer: `${baseURL}/api/auth`,
      resource,
    })
    await expect(validateBearer(rotated.access_token, 'ru')).resolves.toMatchObject({
      type: MCP_BEARER_RESULT.AUTHENTICATED,
    })

    const [user] = await database.queryClient<{ id: string }[]>`select id from "user" where email = 'acceptance@example.com'`
    if (!user) throw new Error('Expected acceptance user')
    const management = createOAuthGrantManagement(database.db)
    const [grant] = await management.listActive(user.id)
    if (!grant) throw new Error('Expected active OAuth grant')
    await expect(management.revoke({
      actorUserId: user.id,
      grantId: grant.id,
      expectedUpdatedAt: grant.updatedAt,
      channel: AUDIT_CHANNEL.WEB,
    })).resolves.toEqual({ type: OAUTH_GRANT_REVOCATION_RESULT.REVOKED })

    await expect(validateBearer(rotated.access_token, 'ru')).resolves.toEqual({
      type: MCP_BEARER_RESULT.UNAUTHENTICATED,
      requestId: 'acceptance-request',
    })
    const rejectedRefresh = await auth.handler(new Request(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', client_id: clientId, refresh_token: rotated.refresh_token ?? '',
      }),
    }))
    expect(rejectedRefresh.status).toBe(400)
    expect(await rejectedRefresh.text()).not.toContain(rotated.refresh_token)
  })
})
