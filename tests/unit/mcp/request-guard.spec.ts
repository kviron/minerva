import { describe, expect, it } from 'vitest'
import { guardMcpRequest, MCP_REQUEST_RESULT } from '../../../server/modules/mcp/request-guard'

const request = (overrides: Partial<{ method: string, origin: string | null, contentType: string | null, contentLength: string | null }> = {}) => ({
  method: overrides.method ?? 'POST',
  origin: overrides.origin === undefined ? 'https://client.example' : overrides.origin,
  contentType: overrides.contentType === undefined ? 'application/json' : overrides.contentType,
  contentLength: overrides.contentLength === undefined ? '1024' : overrides.contentLength,
})

describe('MCP request guard', () => {
  it('accepts a bounded JSON POST from an allowed origin', () => {
    expect(guardMcpRequest(request(), { allowedOrigins: ['https://client.example'], maxBodyBytes: 1_048_576 }))
      .toEqual({ type: MCP_REQUEST_RESULT.ALLOWED })
  })

  it('accepts a native client request without a browser origin', () => {
    expect(guardMcpRequest(request({ origin: null }), { allowedOrigins: ['https://client.example'], maxBodyBytes: 1_048_576 }))
      .toEqual({ type: MCP_REQUEST_RESULT.ALLOWED })
  })

  it.each([
    ['method', request({ method: 'PUT' })],
    ['origin', request({ origin: 'https://attacker.example' })],
    ['content type', request({ contentType: 'text/plain' })],
    ['missing length', request({ contentLength: null })],
    ['oversized body', request({ contentLength: '1048577' })],
  ])('rejects an invalid %s before dispatch', (_label, candidate) => {
    expect(guardMcpRequest(candidate, { allowedOrigins: ['https://client.example'], maxBodyBytes: 1_048_576 }).type)
      .toBe(MCP_REQUEST_RESULT.REJECTED)
  })
})
