import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { MCP_SCOPE } from '../../../shared/mcp/constants'
import type { McpActor } from './bearer-validator'
import { createDefaultMcpReadServices, registerMcpReadTools, type McpReadServices } from './read-tools'
import { createDefaultMcpMutationDependencies, registerMcpMutationTools, type McpMutationDependencies } from './mutation-tools'

export function createMinervaMcpServer(
  actor: McpActor,
  readServices: McpReadServices = createDefaultMcpReadServices(),
  mutationDependencies?: McpMutationDependencies,
): McpServer {
  const server = new McpServer({
    name: 'Minerva',
    version: '0.1.0',
  })

  server.registerTool('minerva_server_info', {
    title: actor.locale === 'ru' ? 'Сведения о Minerva' : 'Minerva server information',
    description: actor.locale === 'ru'
      ? 'Возвращает безопасные сведения о подключённом MCP-сервере.'
      : 'Returns safe information about the connected MCP server.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => ({
    content: [{
      type: 'text',
      text: JSON.stringify({ name: 'Minerva', resource: actor.resource, scopes: actor.scopes }),
    }],
  }))

  registerMcpReadTools(server, actor, readServices)
  const hasMutationScope = actor.scopes.includes(MCP_SCOPE.DOCUMENTS_WRITE)
    || actor.scopes.includes(MCP_SCOPE.DOCUMENTS_PUBLISH)
  if (hasMutationScope) {
    registerMcpMutationTools(server, actor, mutationDependencies ?? createDefaultMcpMutationDependencies())
  }

  return server
}

export async function handleMinervaMcpRequest(
  request: Request,
  actor: McpActor,
  readServices: McpReadServices = createDefaultMcpReadServices(),
  mutationDependencies?: McpMutationDependencies,
): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })
  const server = createMinervaMcpServer(actor, readServices, mutationDependencies)
  await server.connect(transport)
  return transport.handleRequest(request)
}
