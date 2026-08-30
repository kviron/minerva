import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { createMinervaMcpServer, handleMinervaMcpRequest } from '../../../server/modules/mcp/server'

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

const mcpRequest = (body: unknown) => new Request('https://minerva.example/mcp', {
  method: 'POST',
  headers: {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
    'mcp-protocol-version': '2025-06-18',
  },
  body: JSON.stringify(body),
})

describe('MCP server shell', () => {
  it('pins the reviewed official SDK version', async () => {
    const manifest = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'))
    expect(manifest.dependencies['@modelcontextprotocol/sdk']).toBe('1.29.0')
  })

  it('registers only harmless server information before document capabilities', () => {
    const server = createMinervaMcpServer(actor)

    expect(server).toBeDefined()
  })

  it('answers a real Streamable HTTP initialize request', async () => {
    const response = await handleMinervaMcpRequest(mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'Minerva test client', version: '1.0.0' },
      },
    }), actor)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: { name: 'Minerva', version: '0.1.0' },
        capabilities: { tools: {} },
      },
    })
  })

  it('returns only safe actor-derived information from the shell tool', async () => {
    const response = await handleMinervaMcpRequest(mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'minerva_server_info', arguments: {} },
    }), actor)
    const body = await response.json()
    const serialized = JSON.stringify(body)

    expect(response.status).toBe(200)
    expect(serialized).toContain('Minerva')
    expect(serialized).toContain(actor.resource)
    expect(serialized).not.toContain(actor.userId)
    expect(serialized).not.toContain(actor.grantId)
    expect(serialized).not.toContain(actor.requestId)
  })

  it('keeps validation before transport dispatch at the root route', async () => {
    const [route, handler] = await Promise.all([
      readFile(new URL('../../../server/routes/mcp.post.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../../server/modules/mcp/http-handler.ts', import.meta.url), 'utf8'),
    ])
    expect(handler.indexOf('guardMcpRequest')).toBeLessThan(handler.indexOf('dependencies.dispatch'))
    expect(handler.indexOf('dependencies.validateBearer')).toBeLessThan(handler.indexOf('dependencies.dispatch'))
    expect(handler).toContain('www-authenticate')
    expect(route).not.toContain('requireSession')
    expect(route).toContain('getRequestIP(event, { xForwardedFor: env.TRUST_PROXY })')
  })

  it('returns protocol errors without reflecting malformed input or actor secrets', async () => {
    const malformed = new Request('https://minerva.example/mcp', {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-protocol-version': '2025-06-18',
      },
      body: '{"secret":"do-not-reflect"',
    })
    const response = await handleMinervaMcpRequest(malformed, actor)
    const body = await response.text()

    expect(response.status).toBe(400)
    expect(body).not.toContain('do-not-reflect')
    expect(body).not.toContain(actor.userId)
    expect(body).not.toContain(actor.grantId)
  })

  it('rejects unknown tools without exposing the actor or internal paths', async () => {
    const response = await handleMinervaMcpRequest(mcpRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'minerva_unknown_admin_tool', arguments: {} },
    }), actor)
    const body = await response.text()

    expect(body).toContain('Tool minerva_unknown_admin_tool not found')
    expect(body).not.toContain(actor.userId)
    expect(body).not.toContain(actor.grantId)
    expect(body).not.toContain('D:\\develop')
  })
})
