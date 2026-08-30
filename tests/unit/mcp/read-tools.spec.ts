import { describe, expect, it, vi } from 'vitest'
import type { McpReadServices } from '../../../server/modules/mcp/read-tools'
import { handleMinervaMcpRequest } from '../../../server/modules/mcp/server'

const actor = {
  userId: '00000000-0000-4000-8000-000000000061',
  clientId: 'desktop-ai',
  grantId: '00000000-0000-4000-8000-000000000062',
  issuer: 'https://minerva.example/api/auth',
  resource: 'https://minerva.example/mcp',
  scopes: ['projects:read', 'documents:read'],
  locale: 'ru' as const,
  requestId: 'request-1',
}

const request = (id: number, method: string, params?: unknown) => new Request('https://minerva.example/mcp', {
  method: 'POST',
  headers: {
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
    'mcp-protocol-version': '2025-06-18',
  },
  body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
})

const services = (): McpReadServices => ({
  listProjects: vi.fn().mockResolvedValue({ items: [{ id: 'project-1', name: 'Minerva' }], nextCursor: null }),
  readProject: vi.fn().mockResolvedValue({ id: 'project-1', name: 'Minerva' }),
  listDocumentTree: vi.fn().mockResolvedValue([]),
  readDocument: vi.fn().mockResolvedValue({ id: 'document-1', title: 'Architecture', backlinks: [] }),
  listDocumentVersions: vi.fn().mockResolvedValue([]),
  readDocumentVersion: vi.fn().mockResolvedValue({ versionNumber: 1 }),
  searchDocuments: vi.fn().mockResolvedValue([]),
})

const json = (response: Response) => response.json() as Promise<{
  result?: { tools?: readonly { name: string }[], content?: readonly { text: string }[], isError?: boolean }
}>

describe('MCP read tools', () => {
  it('advertises only tools enabled by delegated scopes', async () => {
    const response = await handleMinervaMcpRequest(request(1, 'tools/list'), actor, services())
    const body = await json(response)

    expect(body.result?.tools?.map(tool => tool.name)).toEqual(expect.arrayContaining([
      'minerva_server_info',
      'minerva_projects_list',
      'minerva_project_read',
      'minerva_document_tree',
      'minerva_document_read',
      'minerva_document_versions_list',
      'minerva_document_version_read',
      'minerva_document_backlinks',
      'minerva_documents_search',
    ]))
  })

  it('does not advertise document tools without documents:read', async () => {
    const response = await handleMinervaMcpRequest(request(2, 'tools/list'), { ...actor, scopes: ['projects:read'] }, services())
    const names = (await json(response)).result?.tools?.map(tool => tool.name)

    expect(names).toEqual(['minerva_server_info', 'minerva_projects_list', 'minerva_project_read'])
  })

  it('validates project pagination and passes an opaque cursor to the shared service', async () => {
    const deps = services()
    const response = await handleMinervaMcpRequest(request(6, 'tools/call', {
      name: 'minerva_projects_list',
      arguments: { limit: 10 },
    }), actor, deps)

    expect(deps.listProjects).toHaveBeenCalledWith(actor.userId, { limit: 10, cursor: null })
    expect(JSON.stringify(await json(response))).toContain('nextCursor')
  })

  it('passes only the authenticated user and validated input to the shared document service', async () => {
    const deps = services()
    const response = await handleMinervaMcpRequest(request(3, 'tools/call', {
      name: 'minerva_document_read',
      arguments: {
        projectId: '00000000-0000-4000-8000-000000000071',
        documentId: '00000000-0000-4000-8000-000000000072',
      },
    }), actor, deps)

    expect(deps.readDocument).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000071',
      '00000000-0000-4000-8000-000000000072',
      actor.userId,
    )
    expect(JSON.stringify(await json(response))).not.toContain(actor.grantId)
  })

  it('maps inaccessible and cross-project resources to the same safe tool error', async () => {
    const deps = services()
    vi.mocked(deps.readDocument).mockResolvedValue(null)
    const response = await handleMinervaMcpRequest(request(4, 'tools/call', {
      name: 'minerva_document_read',
      arguments: {
        projectId: '00000000-0000-4000-8000-000000000071',
        documentId: '00000000-0000-4000-8000-000000000099',
      },
    }), actor, deps)
    const body = await json(response)

    expect(body.result?.isError).toBe(true)
    expect(body.result?.content?.[0]?.text).toBe('Not found')
  })

  it('returns backlinks as a dedicated projection without document content', async () => {
    const deps = services()
    vi.mocked(deps.readDocument).mockResolvedValue({
      id: 'document-1',
      title: 'Architecture',
      draftContent: { type: 'doc', content: [{ type: 'text', text: 'private draft' }] },
      backlinks: [{ id: 'document-2', title: 'Overview' }],
    })
    const response = await handleMinervaMcpRequest(request(5, 'tools/call', {
      name: 'minerva_document_backlinks',
      arguments: {
        projectId: '00000000-0000-4000-8000-000000000071',
        documentId: '00000000-0000-4000-8000-000000000072',
      },
    }), actor, deps)
    const serialized = JSON.stringify(await json(response))

    expect(serialized).toContain('Overview')
    expect(serialized).not.toContain('private draft')
  })
})
