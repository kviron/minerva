import { describe, expect, it, vi } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import type { McpMutationDependencies } from '../../../server/modules/mcp/mutation-tools'
import { handleMinervaMcpRequest } from '../../../server/modules/mcp/server'

const actor = {
  userId: '00000000-0000-4000-8000-000000000061',
  clientId: 'desktop-ai',
  grantId: '00000000-0000-4000-8000-000000000062',
  issuer: 'https://minerva.example/api/auth',
  resource: 'https://minerva.example/mcp',
  scopes: ['documents:write', 'documents:publish'],
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

const dependencies = (): McpMutationDependencies => ({
  runIdempotent: vi.fn(async (_command, operation) => ({ type: 'executed', safeResult: await operation() })),
  createDocument: vi.fn().mockResolvedValue({ ok: true, value: { documentId: 'document-1' } }),
  updateDocument: vi.fn().mockResolvedValue({ ok: true, value: { draftRevision: 1, updatedAt: '2026-07-15T10:00:00.000Z' } }),
  moveDocument: vi.fn().mockResolvedValue({ ok: true, value: { parentId: null, position: 0, updatedAt: '2026-07-15T10:00:00.000Z' } }),
  archiveDocument: vi.fn().mockResolvedValue({ ok: true, value: { archiveBatchId: 'document-1', archivedCount: 1, archivedAt: '2026-07-15T10:00:00.000Z' } }),
  restoreDocument: vi.fn().mockResolvedValue({ ok: true, value: { restoredCount: 1, restoredAt: '2026-07-15T10:00:00.000Z' } }),
  publishDocument: vi.fn().mockResolvedValue({ ok: true, value: { versionNumber: 1, publishedAt: '2026-07-15T10:00:00.000Z' } }),
})

const json = (response: Response) => response.json() as Promise<{
  result?: { tools?: readonly { name: string }[], content?: readonly { text: string }[], isError?: boolean }
}>

describe('MCP document mutation tools', () => {
  it('does not expose project lifecycle administration through the real tool registry', async () => {
    const response = await handleMinervaMcpRequest(
      request(0, 'tools/list'),
      {
        ...actor,
        scopes: ['projects:read', 'documents:read', 'documents:write', 'documents:publish'],
      },
      undefined,
      dependencies(),
    )
    const names = (await json(response)).result?.tools?.map(tool => tool.name) ?? []

    expect(names).toEqual([
      'minerva_server_info',
      'minerva_projects_list',
      'minerva_project_read',
      'minerva_document_tree',
      'minerva_document_read',
      'minerva_document_versions_list',
      'minerva_document_version_read',
      'minerva_document_backlinks',
      'minerva_documents_search',
      'minerva_document_create',
      'minerva_document_update',
      'minerva_document_move',
      'minerva_document_archive',
      'minerva_document_restore',
      'minerva_document_publish',
    ])
  })

  it('advertises write tools and gates publish behind its separate scope', async () => {
    const all = await handleMinervaMcpRequest(request(1, 'tools/list'), actor, undefined, dependencies())
    expect((await json(all)).result?.tools?.map(tool => tool.name)).toEqual(expect.arrayContaining([
      'minerva_document_create',
      'minerva_document_update',
      'minerva_document_move',
      'minerva_document_archive',
      'minerva_document_restore',
      'minerva_document_publish',
    ]))

    const writeOnly = await handleMinervaMcpRequest(
      request(2, 'tools/list'),
      { ...actor, scopes: ['documents:write'] },
      undefined,
      dependencies(),
    )
    const names = (await json(writeOnly)).result?.tools?.map(tool => tool.name) ?? []
    expect(names).toContain('minerva_document_update')
    expect(names).not.toContain('minerva_document_publish')
  })

  it('runs create through the grant/project/tool idempotency scope and shared service', async () => {
    const deps = dependencies()
    const projectId = '00000000-0000-4000-8000-000000000071'
    await handleMinervaMcpRequest(request(3, 'tools/call', {
      name: 'minerva_document_create',
      arguments: {
        projectId,
        idempotencyKey: 'create-home',
        title: 'Главная',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
      },
    }), actor, undefined, deps)

    expect(deps.runIdempotent).toHaveBeenCalledWith(expect.objectContaining({
      grantId: actor.grantId,
      projectId,
      toolName: 'minerva_document_create',
      idempotencyKey: 'create-home',
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
    }), expect.any(Function))
    expect(deps.createDocument).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: actor.userId,
      projectId,
      channel: 'mcp',
      title: 'Главная',
      auditAttribution: {
        kind: 'mcp',
        value: {
          clientId: actor.clientId,
          grantId: actor.grantId,
          scopes: actor.scopes,
          toolName: 'minerva_document_create',
          requestId: actor.requestId,
        },
      },
    }))
  })

  it('requires an idempotency key before mutation dispatch', async () => {
    const deps = dependencies()
    const response = await handleMinervaMcpRequest(request(4, 'tools/call', {
      name: 'minerva_document_publish',
      arguments: {
        projectId: '00000000-0000-4000-8000-000000000071',
        documentId: '00000000-0000-4000-8000-000000000072',
        expectedRevision: 1,
      },
    }), actor, undefined, deps)
    const body = await json(response)

    expect(body.result?.isError).toBe(true)
    expect(deps.runIdempotent).not.toHaveBeenCalled()
    expect(deps.publishDocument).not.toHaveBeenCalled()
  })

  it('rejects schema extras before idempotency or business dispatch', async () => {
    const deps = dependencies()
    const response = await handleMinervaMcpRequest(request(5, 'tools/call', {
      name: 'minerva_document_create',
      arguments: {
        projectId: '00000000-0000-4000-8000-000000000071',
        idempotencyKey: 'create-extra',
        title: 'Главная',
        parentId: null,
        template: DOCUMENT_TEMPLATE.BLANK,
        storagePath: 'private/secret.txt',
      },
    }), actor, undefined, deps)
    const body = await json(response)

    expect(body.result?.isError).toBe(true)
    expect(JSON.stringify(body)).not.toContain('private/secret.txt')
    expect(deps.runIdempotent).not.toHaveBeenCalled()
    expect(deps.createDocument).not.toHaveBeenCalled()
  })
})
