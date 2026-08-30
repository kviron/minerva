import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AUTH_MODE } from '../../../shared/identity/constants'
import { MCP_SCOPES } from '../../../shared/mcp/constants'
import { createMinervaAuth } from '../../../server/modules/identity/auth/create-auth'
import { createOAuthAuthorizationServerMetadataHandler } from '../../../server/modules/identity/auth/oauth-metadata'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const database = createTestDatabase()

beforeAll(async () => {
  await resetTestDatabase()
  await migrate(database.db, { migrationsFolder: 'drizzle' })
  await database.queryClient`
    insert into oauth_client (
      client_id, name, redirect_uris, token_endpoint_auth_method,
      grant_types, response_types, public, require_pkce
    ) values (
      'public-mcp-client', 'Public MCP Client', array['https://client.example/callback'], 'none',
      array['authorization_code'], array['code'], true, true
    )
  `
})

afterAll(() => database.close())

describe('OAuth authorization server discovery', () => {
  it('publishes the exact Minerva authorization-code contract', async () => {
    const auth = createMinervaAuth({
      mode: AUTH_MODE.RUNTIME,
      db: database.db,
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['http://127.0.0.1:3000'],
      mailer: { sendPasswordReset: async () => {} },
      oauth: { resource: 'http://127.0.0.1:3000/mcp' },
    })
    const response = await createOAuthAuthorizationServerMetadataHandler(auth)(
      new Request('http://127.0.0.1:3000/.well-known/oauth-authorization-server/api/auth'),
    )
    const metadata = await response.json()

    expect(response.status).toBe(200)
    expect(metadata).toMatchObject({
      issuer: 'http://127.0.0.1:3000/api/auth',
      authorization_endpoint: 'http://127.0.0.1:3000/api/auth/oauth2/authorize',
      token_endpoint: 'http://127.0.0.1:3000/api/auth/oauth2/token',
      scopes_supported: MCP_SCOPES,
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
    })
    expect(metadata.registration_endpoint).toBeUndefined()
  })

  it.each([
    {
      label: 'an unregistered redirect URI',
      query: { redirect_uri: 'https://attacker.example/callback', scope: 'documents:read', code_challenge: 'challenge', code_challenge_method: 'S256' },
      expectedLocation: '/api/auth/error?error=invalid_redirect',
    },
    {
      label: 'an unknown scope',
      query: { redirect_uri: 'https://client.example/callback', scope: 'documents:admin', code_challenge: 'challenge', code_challenge_method: 'S256' },
      expectedLocation: 'https://client.example/callback?error=invalid_scope',
    },
    {
      label: 'a public-client request without PKCE',
      query: { redirect_uri: 'https://client.example/callback', scope: 'documents:read' },
      expectedLocation: 'https://client.example/callback?error=invalid_request',
    },
  ])('rejects $label before login', async ({ query, expectedLocation }) => {
    const auth = createMinervaAuth({
      mode: AUTH_MODE.RUNTIME,
      db: database.db,
      baseURL: 'http://127.0.0.1:3000',
      trustedOrigins: ['http://127.0.0.1:3000'],
      mailer: { sendPasswordReset: async () => {} },
      oauth: { resource: 'http://127.0.0.1:3000/mcp' },
    })
    const parameters = new URLSearchParams({
      client_id: 'public-mcp-client',
      response_type: 'code',
      ...query,
    })
    const response = await auth.handler(new Request(
      `http://127.0.0.1:3000/api/auth/oauth2/authorize?${parameters.toString()}`,
    ))

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain(expectedLocation)
  })
})
