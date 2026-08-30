import { MCP_SCOPE } from './constants'

export const MCP_CAPABILITY = {
  PROJECT_LIST: 'projects.list',
  PROJECT_READ: 'projects.read',
  DOCUMENT_TREE: 'documents.tree',
  DOCUMENT_READ: 'documents.read',
  DOCUMENT_VERSIONS_LIST: 'document_versions.list',
  DOCUMENT_VERSION_READ: 'document_versions.read',
  DOCUMENT_BACKLINKS: 'document_backlinks.read',
  DOCUMENT_SEARCH: 'documents.search',
  DOCUMENT_CREATE: 'documents.create',
  DOCUMENT_UPDATE: 'documents.update',
  DOCUMENT_MOVE: 'documents.move',
  DOCUMENT_ARCHIVE: 'documents.archive',
  DOCUMENT_RESTORE: 'documents.restore',
  DOCUMENT_PUBLISH: 'documents.publish',
} as const

export type McpCapability = typeof MCP_CAPABILITY[keyof typeof MCP_CAPABILITY]

export const MCP_SCOPE_CAPABILITIES: Readonly<Record<string, readonly McpCapability[]>> = {
  [MCP_SCOPE.PROJECTS_READ]: [
    MCP_CAPABILITY.PROJECT_LIST,
    MCP_CAPABILITY.PROJECT_READ,
  ],
  [MCP_SCOPE.DOCUMENTS_READ]: [
    MCP_CAPABILITY.DOCUMENT_TREE,
    MCP_CAPABILITY.DOCUMENT_READ,
    MCP_CAPABILITY.DOCUMENT_VERSIONS_LIST,
    MCP_CAPABILITY.DOCUMENT_VERSION_READ,
    MCP_CAPABILITY.DOCUMENT_BACKLINKS,
    MCP_CAPABILITY.DOCUMENT_SEARCH,
  ],
  [MCP_SCOPE.DOCUMENTS_WRITE]: [
    MCP_CAPABILITY.DOCUMENT_CREATE,
    MCP_CAPABILITY.DOCUMENT_UPDATE,
    MCP_CAPABILITY.DOCUMENT_MOVE,
    MCP_CAPABILITY.DOCUMENT_ARCHIVE,
    MCP_CAPABILITY.DOCUMENT_RESTORE,
  ],
  [MCP_SCOPE.DOCUMENTS_PUBLISH]: [MCP_CAPABILITY.DOCUMENT_PUBLISH],
}

export const capabilitiesForScopes = (scopes: readonly string[]): ReadonlySet<McpCapability> =>
  new Set(scopes.flatMap(scope => MCP_SCOPE_CAPABILITIES[scope] ?? []))
