import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { DOCUMENT_TEMPLATE } from '../../../shared/documents/constants'
import { AUDIT_CHANNEL } from '../../../shared/projects/constants'
import { createDocumentPersistence, createDocumentWith } from '../../../server/modules/documents/create-document'
import { publishDocumentPersistence, publishDocumentWith } from '../../../server/modules/documents/document-versions'
import { moveDocumentPersistence, moveDocumentWith } from '../../../server/modules/documents/move-document'
import { archiveDocumentPersistence, archiveDocumentWith, restoreDocumentPersistence, restoreDocumentWith } from '../../../server/modules/documents/document-archive'
import { updateDocumentDraftPersistence, updateDocumentDraftWith } from '../../../server/modules/documents/update-document-draft'
import { createMcpIdempotencyCoordinator } from '../../../server/modules/mcp/idempotency-coordinator'
import { createMcpIdempotencyPersistence } from '../../../server/modules/mcp/idempotency-persistence'
import type { McpMutationDependencies } from '../../../server/modules/mcp/mutation-tools'
import { handleMinervaMcpRequest } from '../../../server/modules/mcp/server'
import { createProjectPersistence } from '../../../server/modules/projects/create-project'
import { createTestDatabase, resetTestDatabase } from '../../helpers/database'

const userId = '00000000-0000-4000-8000-000000000101'
const grantId = '00000000-0000-4000-8000-000000000102'
const clientId = 'mcp-mutations-client'

const actor = {
  userId, clientId, grantId,
  issuer: 'https://minerva.example/api/auth',
  resource: 'https://minerva.example/mcp',
  scopes: ['documents:write', 'documents:publish'],
  locale: 'ru' as const,
  requestId: 'mutation-request-1',
}

const createClient = async (dependencies: McpMutationDependencies) => {
  const client = new Client({ name: 'Minerva acceptance client', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(actor.resource), {
    fetch: (input, init) => handleMinervaMcpRequest(new Request(input, init), actor, undefined, dependencies),
  })
  await client.connect(transport)
  return client
}

const call = async (client: Client, name: string, args: Record<string, unknown>) => {
  const result = CallToolResultSchema.parse(await client.callTool({ name, arguments: args }))
  const text = result.content.find(item => item.type === 'text')
  return { value: JSON.parse(text?.text ?? 'null') as unknown, isError: result.isError ?? false }
}

beforeEach(async () => {
  await resetTestDatabase()
  const database = createTestDatabase()
  try {
    await migrate(database.db, { migrationsFolder: 'drizzle' })
    await database.queryClient`insert into "user" (id, name, email, email_verified, status) values (${userId}, 'MCP Editor', 'mcp-editor@example.com', true, 'active')`
    await database.queryClient`insert into oauth_client (client_id, name, redirect_uris, token_endpoint_auth_method) values (${clientId}, 'MCP mutations', array['https://client.example/callback'], 'none')`
    await database.queryClient`insert into oauth_grants (id, user_id, client_id, resource, scopes) values (${grantId}, ${userId}, ${clientId}, 'https://minerva.example/mcp', array['documents:write', 'documents:publish'])`
  } finally {
    await database.close()
  }
})

describe('MCP document mutations', () => {
  it('creates, replays, updates and publishes through shared services with content-free attribution', async () => {
    const database = createTestDatabase()
    try {
      const project = await createProjectPersistence(database.db)({ actorUserId: userId, channel: AUDIT_CHANNEL.MCP, name: 'MCP project', description: null })
      const dependencies: McpMutationDependencies = {
        runIdempotent: createMcpIdempotencyCoordinator(createMcpIdempotencyPersistence({ db: database.db })),
        createDocument: createDocumentWith({ persist: createDocumentPersistence(database.db) }),
        updateDocument: updateDocumentDraftWith({ persist: updateDocumentDraftPersistence(database.db) }),
        moveDocument: moveDocumentWith({ persist: moveDocumentPersistence(database.db) }),
        archiveDocument: archiveDocumentWith({ archive: archiveDocumentPersistence(database.db) }),
        restoreDocument: restoreDocumentWith({ restore: restoreDocumentPersistence(database.db) }),
        publishDocument: publishDocumentWith({ publish: publishDocumentPersistence(database.db) }),
      }
      const client = await createClient(dependencies)
      expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
        'minerva_document_create', 'minerva_document_update', 'minerva_document_publish',
      ]))
      const createArgs = { projectId: project.projectId, idempotencyKey: 'create-home', title: 'Главная', parentId: null, template: DOCUMENT_TEMPLATE.BLANK }
      const first = await call(client, 'minerva_document_create', createArgs)
      const replay = await call(client, 'minerva_document_create', createArgs)
      expect(replay).toEqual(first)
      const documentId = (first.value as { ok: true, value: { documentId: string } }).value.documentId
      expect(await database.queryClient`select count(*)::int as count from documents where project_id = ${project.projectId}`).toEqual([{ count: 1 }])

      const content = { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Safe body' }] }] }
      await expect(call(client, 'minerva_document_update', { projectId: project.projectId, documentId, idempotencyKey: 'update-home', title: 'Главная 2', content, expectedRevision: 0 }))
        .resolves.toMatchObject({ value: { ok: true, value: { draftRevision: 1 } } })
      await expect(call(client, 'minerva_document_publish', { projectId: project.projectId, documentId, idempotencyKey: 'publish-home', expectedRevision: 1 }))
        .resolves.toMatchObject({ value: { ok: true, value: { versionNumber: 1 } } })

      const events = await database.queryClient`select metadata from audit_events where project_id = ${project.projectId} and channel = 'mcp' and target_type = 'document' order by created_at`
      expect(events).toHaveLength(3)
      for (const event of events) {
        expect(event.metadata).toMatchObject({ mcp: { clientId, grantId, scopes: actor.scopes, requestId: actor.requestId } })
        expect(JSON.stringify(event.metadata)).not.toContain('Safe body')
      }
      await client.close()
    } finally {
      await database.close()
    }
  })
})
