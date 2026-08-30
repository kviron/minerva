import { describe, expect, it, vi } from 'vitest'
import { MCP_BEARER_RESULT } from '../../../server/modules/mcp/bearer-validator'
import { createMcpHttpHandler } from '../../../server/modules/mcp/http-handler'

const actor = {
  userId: '00000000-0000-4000-8000-000000000061',
  clientId: 'desktop-ai',
  grantId: '00000000-0000-4000-8000-000000000062',
  issuer: 'https://minerva.example/api/auth',
  resource: 'https://minerva.example/mcp',
  scopes: ['projects:read'],
  locale: 'ru' as const,
  requestId: 'request-1',
}

const request = (overrides: Partial<{ token: string, origin: string, type: string, length: string }> = {}) => new Request('https://minerva.example/mcp', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${overrides.token ?? 'opaque-token'}`,
    origin: overrides.origin ?? 'https://client.example',
    'content-type': overrides.type ?? 'application/json',
    'content-length': overrides.length ?? '2',
  },
  body: '{}',
})

const requestWithBody = (body: string, declaredLength: string) => new Request('https://minerva.example/mcp', {
  method: 'POST',
  headers: {
    authorization: 'Bearer opaque-token',
    origin: 'https://client.example',
    'content-type': 'application/json',
    'content-length': declaredLength,
  },
  body,
})

const dependencies = () => ({
  allowedOrigins: ['https://client.example'],
  maxBodyBytes: 1_048_576,
  resourceMetadataUrl: 'https://minerva.example/.well-known/oauth-protected-resource/mcp',
  consumeRateLimit: vi.fn().mockResolvedValue(true),
  validateBearer: vi.fn().mockResolvedValue({ type: MCP_BEARER_RESULT.AUTHENTICATED, actor }),
  recordRejectedAuthentication: vi.fn().mockResolvedValue(undefined),
  dispatch: vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
})

describe('MCP HTTP handler', () => {
  it('dispatches only after request and bearer validation', async () => {
    const deps = dependencies()
    const response = await createMcpHttpHandler(deps)(request(), '127.0.0.1')

    expect(response.status).toBe(200)
    expect(deps.consumeRateLimit).toHaveBeenCalledWith('127.0.0.1', 'opaque-token')
    expect(deps.validateBearer).toHaveBeenCalledWith('opaque-token', 'ru')
    expect(deps.dispatch).toHaveBeenCalledWith(expect.any(Request), actor)
  })

  it('returns one non-revealing bearer challenge and never dispatches an inactive token', async () => {
    const deps = dependencies()
    deps.validateBearer.mockResolvedValue({ type: MCP_BEARER_RESULT.UNAUTHENTICATED, requestId: 'request-2' })

    const response = await createMcpHttpHandler(deps)(request(), '127.0.0.1')
    const body = await response.text()

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(
      'Bearer resource_metadata="https://minerva.example/.well-known/oauth-protected-resource/mcp", error="invalid_token"',
    )
    expect(body).not.toContain('request-2')
    expect(body).not.toContain('opaque-token')
    expect(deps.recordRejectedAuthentication).toHaveBeenCalledWith({ requestId: 'request-2' })
    expect(deps.dispatch).not.toHaveBeenCalled()
  })

  it.each([
    ['origin', request({ origin: 'https://attacker.example' })],
    ['content type', request({ type: 'text/plain' })],
    ['body size', request({ length: '1048577' })],
  ])('rejects invalid %s before bearer lookup', async (_label, candidate) => {
    const deps = dependencies()
    const response = await createMcpHttpHandler(deps)(candidate, '127.0.0.1')

    expect(response.status).toBe(400)
    expect(deps.validateBearer).not.toHaveBeenCalled()
    expect(deps.dispatch).not.toHaveBeenCalled()
  })

  it('returns 429 before bearer lookup when the request budget is exhausted', async () => {
    const deps = dependencies()
    deps.consumeRateLimit.mockResolvedValue(false)
    const response = await createMcpHttpHandler(deps)(request(), '127.0.0.1')

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(deps.validateBearer).not.toHaveBeenCalled()
    expect(deps.dispatch).not.toHaveBeenCalled()
  })

  it('measures actual bytes and rejects a body larger than its declared length', async () => {
    const deps = { ...dependencies(), maxBodyBytes: 4 }
    const response = await createMcpHttpHandler(deps)(requestWithBody('12345', '2'), '127.0.0.1')

    expect(response.status).toBe(400)
    expect(deps.dispatch).not.toHaveBeenCalled()
  })
})
