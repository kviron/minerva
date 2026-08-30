import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { createMcpBearerValidator, MCP_BEARER_RESULT } from '../../../server/modules/mcp/bearer-validator'

const tokenRecord = {
  userId: '00000000-0000-4000-8000-000000000061',
  accountStatus: 'active',
  clientId: 'desktop-ai',
  grantId: '00000000-0000-4000-8000-000000000062',
  grantStatus: 'active',
  grantResource: 'https://minerva.example/mcp',
  tokenScopes: ['projects:read', 'documents:read'],
  grantScopes: ['projects:read', 'documents:read'],
  expiresAt: new Date('2026-07-14T13:00:00.000Z'),
} as const

const validateWith = (record: typeof tokenRecord | null) => createMcpBearerValidator({
  findByTokenHash: vi.fn().mockResolvedValue(record),
  now: () => new Date('2026-07-14T12:00:00.000Z'),
  createRequestId: () => 'request-1',
  issuer: 'https://minerva.example/api/auth',
  resource: 'https://minerva.example/mcp',
})

describe('MCP bearer validator', () => {
  it('returns the complete transport-independent actor for an active bound token', async () => {
    const findByTokenHash = vi.fn().mockResolvedValue(tokenRecord)
    const validate = createMcpBearerValidator({
      findByTokenHash,
      now: () => new Date('2026-07-14T12:00:00.000Z'),
      createRequestId: () => 'request-1',
      issuer: 'https://minerva.example/api/auth',
      resource: 'https://minerva.example/mcp',
    })

    await expect(validate('opaque-secret', 'ru')).resolves.toEqual({
      type: MCP_BEARER_RESULT.AUTHENTICATED,
      actor: {
        userId: tokenRecord.userId,
        clientId: tokenRecord.clientId,
        grantId: tokenRecord.grantId,
        issuer: 'https://minerva.example/api/auth',
        resource: tokenRecord.grantResource,
        scopes: tokenRecord.tokenScopes,
        locale: 'ru',
        requestId: 'request-1',
      },
    })
    expect(findByTokenHash).toHaveBeenCalledWith(
      createHash('sha256').update('opaque-secret').digest('base64url'),
    )
  })

  it.each([
    ['missing token', undefined, tokenRecord],
    ['unknown token', 'missing', null],
    ['expired token', 'token', { ...tokenRecord, expiresAt: new Date('2026-07-14T11:59:59.000Z') }],
    ['disabled user', 'token', { ...tokenRecord, accountStatus: 'disabled' }],
    ['revoked grant', 'token', { ...tokenRecord, grantStatus: 'revoked' }],
    ['wrong resource', 'token', { ...tokenRecord, grantResource: 'https://other.example/mcp' }],
    ['scope escalation', 'token', { ...tokenRecord, tokenScopes: ['documents:publish'], grantScopes: ['documents:read'] }],
  ])('fails closed for %s', async (_label, token, record) => {
    await expect(validateWith(record)(token, 'en')).resolves.toEqual({
      type: MCP_BEARER_RESULT.UNAUTHENTICATED,
      requestId: 'request-1',
    })
  })
})
